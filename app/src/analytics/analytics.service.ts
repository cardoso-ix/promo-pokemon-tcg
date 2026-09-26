import { sql, and, gte, lte, desc, eq } from 'drizzle-orm';
import { getAnalyticsDb } from './db.js';
import { meliOrders, metaAdInsights, dailyAnalyticsSummary } from './schema.js';

export interface DashboardKpiSummary {
  periodo: {
    startDate: string;
    endDate: string;
    totalDias: number;
  };
  totais: {
    totalRevenueMeli: number;
    totalOrdersMeli: number;
    totalFeesMeli: number;
    totalShippingMeli: number;
    totalSpendMeta: number;
    blendedRoas: number;
    avgCac: number;
    netOperatingMargin: number;
    margemPercentual: number;
  };
  serieTemporal: Array<{
    date: string;
    revenueMeli: number;
    ordersMeli: number;
    feesMeli: number;
    shippingMeli: number;
    spendMeta: number;
    roasDia: number;
    cacDia: number;
    margemLiquidaDia: number;
  }>;
  topCampanhasMeta: Array<{
    campaignId: string;
    campaignName: string;
    spend: number;
    impressions: number;
    clicks: number;
    purchases: number;
    purchaseValue: number;
    cpc: number;
    roasAtribuido: number;
  }>;
}

export class AnalyticsConsolidationService {
  /**
   * Consolida as métricas diárias de vendas (Mercado Livre) e mídia (Meta Ads) para uma data YYYY-MM-DD
   */
  async consolidateDailySummary(dateStr: string): Promise<void> {
    const db = getAnalyticsDb();
    if (!db) return;

    // 1. Agrega pedidos do Mercado Livre da data
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const meliAgg = await db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(CAST(${meliOrders.paidAmount} AS NUMERIC)), 0.00)`,
        totalOrders: sql<number>`CAST(COUNT(${meliOrders.orderId}) AS INT)`,
        totalFees: sql<string>`COALESCE(SUM(CAST(${meliOrders.marketplaceFee} AS NUMERIC)), 0.00)`,
        totalShipping: sql<string>`COALESCE(SUM(CAST(${meliOrders.shippingCost} AS NUMERIC)), 0.00)`
      })
      .from(meliOrders)
      .where(
        and(
          gte(meliOrders.dateCreated, startOfDay),
          lte(meliOrders.dateCreated, endOfDay),
          sql`${meliOrders.status} NOT IN ('cancelled', 'invalid')`
        )
      );

    const revenue = parseFloat(meliAgg[0]?.totalRevenue || '0') || 0;
    const orders = Number(meliAgg[0]?.totalOrders) || 0;
    const fees = parseFloat(meliAgg[0]?.totalFees || '0') || 0;
    const shipping = parseFloat(meliAgg[0]?.totalShipping || '0') || 0;

    // 2. Agrega investimento de campanhas do Meta Ads na mesma data
    const metaAgg = await db
      .select({
        totalSpend: sql<string>`COALESCE(SUM(CAST(${metaAdInsights.spend} AS NUMERIC)), 0.00)`
      })
      .from(metaAdInsights)
      .where(eq(metaAdInsights.date, dateStr));

    const spend = parseFloat(metaAgg[0]?.totalSpend || '0') || 0;

    // 3. Cálculos de Inteligência de Negócio
    // Blended ROAS = Faturamento Meli / Investimento Meta
    const blendedRoas = spend > 0 ? Number((revenue / spend).toFixed(2)) : 0;

    // CAC = Investimento Meta / Qtd Pedidos Meli
    const avgCac = orders > 0 ? Number((spend / orders).toFixed(2)) : 0;

    // Margem Operacional Líquida = Faturamento - Taxas Meli - Frete Meli - Investimento Meta
    const netMargin = Number((revenue - fees - shipping - spend).toFixed(2));

    // 4. Upsert na tabela consolidada
    await db
      .insert(dailyAnalyticsSummary)
      .values({
        date: dateStr,
        totalRevenue: revenue.toFixed(2),
        totalOrders: orders,
        totalFees: fees.toFixed(2),
        totalShipping: shipping.toFixed(2),
        totalSpend: spend.toFixed(2),
        blendedRoas: blendedRoas.toFixed(2),
        avgCac: avgCac.toFixed(2),
        netOperatingMargin: netMargin.toFixed(2),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: dailyAnalyticsSummary.date,
        set: {
          totalRevenue: revenue.toFixed(2),
          totalOrders: orders,
          totalFees: fees.toFixed(2),
          totalShipping: shipping.toFixed(2),
          totalSpend: spend.toFixed(2),
          blendedRoas: blendedRoas.toFixed(2),
          avgCac: avgCac.toFixed(2),
          netOperatingMargin: netMargin.toFixed(2),
          updatedAt: new Date()
        }
      });
  }

  /**
   * Executa consolidação em lote para um intervalo de datas
   */
  async consolidateRange(startDate: string, endDate: string): Promise<number> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;

    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      await this.consolidateDailySummary(dateStr);
      count++;
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Consulta o overview do Dashboard para um intervalo de datas
   */
  async getDashboardOverview(startDate?: string, endDate?: string): Promise<DashboardKpiSummary> {
    const db = getAnalyticsDb();

    // Default: últimos 30 dias até hoje
    const hoje = new Date();
    const defaultEnd = hoje.toISOString().split('T')[0];
    const trintaDiasAtras = new Date(hoje.getTime() - 29 * 24 * 60 * 60 * 1000);
    const defaultStart = trintaDiasAtras.toISOString().split('T')[0];

    const finalStart = startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : defaultStart;
    const finalEnd = endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate) ? endDate : defaultEnd;

    // Fallback caso banco não esteja configurado
    if (!db) {
      return {
        periodo: { startDate: finalStart, endDate: finalEnd, totalDias: 0 },
        totais: {
          totalRevenueMeli: 0,
          totalOrdersMeli: 0,
          totalFeesMeli: 0,
          totalShippingMeli: 0,
          totalSpendMeta: 0,
          blendedRoas: 0,
          avgCac: 0,
          netOperatingMargin: 0,
          margemPercentual: 0
        },
        serieTemporal: [],
        topCampanhasMeta: []
      };
    }

    // Garante que o rollup das datas solicitadas esteja atualizado
    await this.consolidateRange(finalStart, finalEnd);

    // 1. Busca os registros consolidados da série temporal
    const rows = await db
      .select()
      .from(dailyAnalyticsSummary)
      .where(
        and(
          gte(dailyAnalyticsSummary.date, finalStart),
          lte(dailyAnalyticsSummary.date, finalEnd)
        )
      )
      .orderBy(dailyAnalyticsSummary.date);

    let sumRevenue = 0;
    let sumOrders = 0;
    let sumFees = 0;
    let sumShipping = 0;
    let sumSpend = 0;

    const serieTemporal = rows.map((r) => {
      const rev = parseFloat(r.totalRevenue) || 0;
      const ord = Number(r.totalOrders) || 0;
      const fee = parseFloat(r.totalFees) || 0;
      const shp = parseFloat(r.totalShipping) || 0;
      const spd = parseFloat(r.totalSpend) || 0;
      const roas = parseFloat(r.blendedRoas) || 0;
      const cac = parseFloat(r.avgCac) || 0;
      const margin = parseFloat(r.netOperatingMargin) || 0;

      sumRevenue += rev;
      sumOrders += ord;
      sumFees += fee;
      sumShipping += shp;
      sumSpend += spd;

      return {
        date: r.date,
        revenueMeli: rev,
        ordersMeli: ord,
        feesMeli: fee,
        shippingMeli: shp,
        spendMeta: spd,
        roasDia: roas,
        cacDia: cac,
        margemLiquidaDia: margin
      };
    });

    const totalRevenueMeli = Number(sumRevenue.toFixed(2));
    const totalOrdersMeli = sumOrders;
    const totalFeesMeli = Number(sumFees.toFixed(2));
    const totalShippingMeli = Number(sumShipping.toFixed(2));
    const totalSpendMeta = Number(sumSpend.toFixed(2));

    const blendedRoas = totalSpendMeta > 0 ? Number((totalRevenueMeli / totalSpendMeta).toFixed(2)) : 0;
    const avgCac = totalOrdersMeli > 0 ? Number((totalSpendMeta / totalOrdersMeli).toFixed(2)) : 0;
    const netOperatingMargin = Number((totalRevenueMeli - totalFeesMeli - totalShippingMeli - totalSpendMeta).toFixed(2));
    const margemPercentual = totalRevenueMeli > 0 ? Number(((netOperatingMargin / totalRevenueMeli) * 100).toFixed(2)) : 0;

    // 2. Busca Top Campanhas do Meta no período
    const topCampanhas = await db
      .select({
        campaignId: metaAdInsights.campaignId,
        campaignName: metaAdInsights.campaignName,
        spend: sql<string>`COALESCE(SUM(CAST(${metaAdInsights.spend} AS NUMERIC)), 0.00)`,
        impressions: sql<number>`CAST(SUM(${metaAdInsights.impressions}) AS INT)`,
        clicks: sql<number>`CAST(SUM(${metaAdInsights.clicks}) AS INT)`,
        purchases: sql<number>`CAST(SUM(${metaAdInsights.purchases}) AS INT)`,
        purchaseValue: sql<string>`COALESCE(SUM(CAST(${metaAdInsights.purchaseValue} AS NUMERIC)), 0.00)`
      })
      .from(metaAdInsights)
      .where(
        and(
          gte(metaAdInsights.date, finalStart),
          lte(metaAdInsights.date, finalEnd)
        )
      )
      .groupBy(metaAdInsights.campaignId, metaAdInsights.campaignName)
      .orderBy(desc(sql`SUM(CAST(${metaAdInsights.spend} AS NUMERIC))`))
      .limit(10);

    const topCampanhasMeta = topCampanhas.map((c) => {
      const sp = parseFloat(c.spend) || 0;
      const cl = Number(c.clicks) || 0;
      const val = parseFloat(c.purchaseValue) || 0;
      const cpc = cl > 0 ? Number((sp / cl).toFixed(2)) : 0;
      const roasAtribuido = sp > 0 ? Number((val / sp).toFixed(2)) : 0;

      return {
        campaignId: c.campaignId,
        campaignName: c.campaignName,
        spend: sp,
        impressions: Number(c.impressions) || 0,
        clicks: cl,
        purchases: Number(c.purchases) || 0,
        purchaseValue: val,
        cpc,
        roasAtribuido
      };
    });

    return {
      periodo: {
        startDate: finalStart,
        endDate: finalEnd,
        totalDias: serieTemporal.length
      },
      totais: {
        totalRevenueMeli,
        totalOrdersMeli,
        totalFeesMeli,
        totalShippingMeli,
        totalSpendMeta,
        blendedRoas,
        avgCac,
        netOperatingMargin,
        margemPercentual
      },
      serieTemporal,
      topCampanhasMeta
    };
  }
}

export const analyticsService = new AnalyticsConsolidationService();
