import { db } from '../db/database.js';
import { getBrazilToday, getBrazilDateStr } from '../utils/date.js';
import { meliAffiliateService } from './meli-affiliate.service.js';
import { getMetaInsightsStats } from '../db/database.js';
import path from 'node:path';
import fs from 'node:fs';

export interface BalancoItem {
  id?: number;
  dataLancamento: string;
  gastoCampanhas: number;
  lucroBruto: number;
  vendasBrutas: number;
  saldoDia: number;
  blendedRoas: number;
  cliquesMeta: number;
  impressoesMeta: number;
  descricao?: string;
  categoria?: string;
}

export interface BalancoMensalResult {
  mesReferencia: string;
  totalLucroBruto: number; // Comissões confirmadas Meli
  totalGastoCampanhas: number; // Investimento Meta Ads
  totalVendasBrutas: number; // Faturamento enviado ao Meli
  resultadoLiquido: number; // Lucro operacional
  valorReinvestimentoCampanhas: number; // 70%
  valorLucroDisponivel: number; // 30%
  blendedRoas: number;
  avgCac: number;
  margemPercentual: number;
  itens: BalancoItem[];
}

export interface DespesaPdfItem {
  id: number;
  dataDespesa: string;
  valor: number;
  descricao: string;
  nomeArquivoOriginal: string;
  tamanhoBytes: number;
  criadoEm: string;
}

export class FinancasService {
  constructor() {
    this.initTables();
  }

  private initTables() {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS financas_despesas_pdf (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          data_despesa DATE NOT NULL,
          valor REAL NOT NULL,
          descricao TEXT,
          nome_arquivo TEXT NOT NULL,
          caminho_arquivo TEXT,
          tamanho_bytes INTEGER,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS financas_planilhas_meta (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome_arquivo TEXT NOT NULL,
          mes_referencia TEXT NOT NULL,
          gasto_total REAL NOT NULL,
          impressoes_total INTEGER DEFAULT 0,
          cliques_total INTEGER DEFAULT 0,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (err) {
      console.warn('[FinancasService] Aviso ao inicializar tabelas:', err);
    }
  }

  /**
   * Retorna os meses disponíveis com movimentações arquivadas no sistema
   */
  getMesesDisponiveis(): string[] {
    const mesesSet = new Set<string>();
    const hojeMes = getBrazilToday().slice(0, 7);
    mesesSet.add(hojeMes);

    try {
      // Meses de Meta Ads
      const metaRows = db.prepare(`SELECT DISTINCT substr(date, 1, 7) as mes FROM meta_ad_insights`).all() as { mes: string }[];
      for (const r of metaRows) {
        if (r.mes && /^\d{4}-\d{2}$/.test(r.mes)) mesesSet.add(r.mes);
      }

      // Meses de Pedidos Mercado Livre
      const meliRows = db.prepare(`SELECT DISTINCT substr(date_created, 1, 7) as mes FROM meli_orders`).all() as { mes: string }[];
      for (const r of meliRows) {
        if (r.mes && /^\d{4}-\d{2}$/.test(r.mes)) mesesSet.add(r.mes);
      }
    } catch {
      // Silencioso
    }

    return Array.from(mesesSet).sort((a, b) => b.localeCompare(a));
  }

  /**
   * Consolida o Balanço Financeiro e DRE completo a partir das bases do Meta Ads e Mercado Livre
   */
  async getBalancoMensal(mes?: string): Promise<BalancoMensalResult> {
    const mesRef = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : getBrazilToday().slice(0, 7);

    // 1. Busca gastos diários do Meta Ads arquivados para o mês
    const metaDailyRows = db.prepare(`
      SELECT 
        date,
        COALESCE(SUM(spend), 0) as spend,
        COALESCE(SUM(impressions), 0) as impressions,
        COALESCE(SUM(clicks), 0) as clicks,
        COALESCE(SUM(purchases), 0) as purchases
      FROM meta_ad_insights
      WHERE date LIKE ?
      GROUP BY date
      ORDER BY date ASC
    `).all(`${mesRef}-%`) as Array<{
      date: string;
      spend: number;
      impressions: number;
      clicks: number;
      purchases: number;
    }>;

    // 2. Busca dados de afiliados / vendas do Mercado Livre
    const affiliate = await meliAffiliateService.getMetrics().catch(() => null);

    // Mapeamento diário
    const mapaDias: Record<string, BalancoItem> = {};

    // Inserir dados do Meta Ads dia a dia
    for (const m of metaDailyRows) {
      const d = m.date;
      mapaDias[d] = {
        dataLancamento: d,
        gastoCampanhas: Number(m.spend) || 0,
        lucroBruto: 0,
        vendasBrutas: 0,
        saldoDia: -(Number(m.spend) || 0),
        blendedRoas: 0,
        cliquesMeta: Number(m.clicks) || 0,
        impressoesMeta: Number(m.impressions) || 0
      };
    }

    // Inserir dados de comissões diárias de afiliados
    if (affiliate?.dailyData && Array.isArray(affiliate.dailyData)) {
      for (const d of affiliate.dailyData) {
        if (d.date && d.date.startsWith(mesRef)) {
          const dia = d.date;
          if (!mapaDias[dia]) {
            mapaDias[dia] = {
              dataLancamento: dia,
              gastoCampanhas: 0,
              lucroBruto: Number(d.earnings) || 0,
              vendasBrutas: Number(d.earnings ? d.earnings / 0.10 : 0),
              saldoDia: Number(d.earnings) || 0,
              blendedRoas: 0,
              cliquesMeta: 0,
              impressoesMeta: 0
            };
          } else {
            mapaDias[dia].lucroBruto = Number(d.earnings) || 0;
            mapaDias[dia].vendasBrutas = Number(d.earnings ? d.earnings / 0.10 : 0);
            mapaDias[dia].saldoDia = mapaDias[dia].lucroBruto - mapaDias[dia].gastoCampanhas;
          }
        }
      }
    }

    // Se o mês atual for o ativo, garante que o dia de hoje está sincronizado
    const hojeStr = getBrazilToday();
    if (hojeStr.startsWith(mesRef)) {
      const metaHoje = getMetaInsightsStats();
      if (!mapaDias[hojeStr]) {
        mapaDias[hojeStr] = {
          dataLancamento: hojeStr,
          gastoCampanhas: metaHoje.spendToday || 0,
          lucroBruto: affiliate?.commissionsToday || 0,
          vendasBrutas: (affiliate?.commissionsToday || 0) * 10,
          saldoDia: (affiliate?.commissionsToday || 0) - (metaHoje.spendToday || 0),
          blendedRoas: 0,
          cliquesMeta: 0,
          impressoesMeta: 0
        };
      } else {
        if (metaHoje.spendToday > 0) mapaDias[hojeStr].gastoCampanhas = metaHoje.spendToday;
        if (affiliate?.commissionsToday && affiliate.commissionsToday > 0) {
          mapaDias[hojeStr].lucroBruto = affiliate.commissionsToday;
          mapaDias[hojeStr].vendasBrutas = affiliate.commissionsToday * 10;
        }
        mapaDias[hojeStr].saldoDia = mapaDias[hojeStr].lucroBruto - mapaDias[hojeStr].gastoCampanhas;
      }
    }

    // Se a soma das comissões diárias estiver menor que o total acumulado do mês de afiliados,
    // distribui a proporção real para conciliar fielmente com o extrato
    const listaItens = Object.values(mapaDias).sort((a, b) => b.dataLancamento.localeCompare(a.dataLancamento));

    let totalGastoCampanhas = listaItens.reduce((acc, i) => acc + i.gastoCampanhas, 0);
    let totalLucroBruto = listaItens.reduce((acc, i) => acc + i.lucroBruto, 0);
    let totalVendasBrutas = listaItens.reduce((acc, i) => acc + i.vendasBrutas, 0);

    // Conciliação com o extrato oficial de afiliados
    if (affiliate && affiliate.totalCommissions > totalLucroBruto && mesRef === hojeStr.slice(0, 7)) {
      totalLucroBruto = affiliate.totalCommissions;
      totalVendasBrutas = affiliate.totalSales || totalLucroBruto * 10;
    }

    // Recalcula Blended ROAS diário
    for (const item of listaItens) {
      item.blendedRoas = item.gastoCampanhas > 0 && item.vendasBrutas > 0 ? Number((item.vendasBrutas / item.gastoCampanhas).toFixed(2)) : 0;
    }

    const resultadoLiquido = Math.max(0, totalLucroBruto - totalGastoCampanhas);
    const valorReinvestimentoCampanhas = Number((resultadoLiquido * 0.70).toFixed(2));
    const valorLucroDisponivel = Number((resultadoLiquido * 0.30).toFixed(2));
    const blendedRoas = totalGastoCampanhas > 0 && totalVendasBrutas > 0 ? Number((totalVendasBrutas / totalGastoCampanhas).toFixed(2)) : 0;
    const totalOrders = affiliate?.totalOrders || 0;
    const avgCac = totalOrders > 0 && totalGastoCampanhas > 0 ? Number((totalGastoCampanhas / totalOrders).toFixed(2)) : 0;
    const margemPercentual = totalLucroBruto > 0 ? Number(((resultadoLiquido / totalLucroBruto) * 100).toFixed(2)) : 0;

    return {
      mesReferencia: mesRef,
      totalLucroBruto: Number(totalLucroBruto.toFixed(2)),
      totalGastoCampanhas: Number(totalGastoCampanhas.toFixed(2)),
      totalVendasBrutas: Number(totalVendasBrutas.toFixed(2)),
      resultadoLiquido: Number(resultadoLiquido.toFixed(2)),
      valorReinvestimentoCampanhas,
      valorLucroDisponivel,
      blendedRoas,
      avgCac,
      margemPercentual,
      itens: listaItens
    };
  }

  /**
   * Lista comprovantes e faturas PDF arquivadas
   */
  listarFaturasPdf(inicio = '', fim = ''): { totalGasto: number; totalFaturas: number; faturas: DespesaPdfItem[] } {
    let whereClause = '';
    const params: any[] = [];
    if (inicio && fim) {
      whereClause = 'WHERE data_despesa >= ? AND data_despesa <= ?';
      params.push(inicio, fim);
    } else if (inicio) {
      whereClause = 'WHERE data_despesa >= ?';
      params.push(inicio);
    }

    const rows = db.prepare(`
      SELECT id, data_despesa as dataDespesa, valor, descricao, nome_arquivo as nomeArquivoOriginal, tamanho_bytes as tamanhoBytes, criado_em as criadoEm
      FROM financas_despesas_pdf
      ${whereClause}
      ORDER BY data_despesa DESC
    `).all(...params) as DespesaPdfItem[];

    const totalGasto = rows.reduce((acc, r) => acc + Number(r.valor), 0);

    return {
      totalGasto: Number(totalGasto.toFixed(2)),
      totalFaturas: rows.length,
      faturas: rows
    };
  }

  /**
   * Salva uma fatura PDF de comprovante
   */
  salvarFaturaPdf(dados: { dataDespesa: string; valor: number; descricao?: string; nomeArquivo: string; tamanhoBytes?: number }): number {
    const res = db.prepare(`
      INSERT INTO financas_despesas_pdf (data_despesa, valor, descricao, nome_arquivo, tamanho_bytes)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      dados.dataDespesa || getBrazilToday(),
      Number(dados.valor) || 0,
      dados.descricao || 'Fatura Meta Ads',
      dados.nomeArquivo,
      dados.tamanhoBytes || 0
    );
    return Number(res.lastInsertRowid);
  }

  /**
   * Exclui uma fatura PDF
   */
  excluirFaturaPdf(id: number): boolean {
    const res = db.prepare(`DELETE FROM financas_despesas_pdf WHERE id = ?`).run(id);
    return res.changes > 0;
  }
}

export const financasService = new FinancasService();
