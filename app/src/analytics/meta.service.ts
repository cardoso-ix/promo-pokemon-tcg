import { eq, sql } from 'drizzle-orm';
import { getAnalyticsDb } from './db.js';
import { integrationTokens, metaAdInsights } from './schema.js';
import { encryptToken, decryptToken } from './security.js';
import { getConfig, setConfig, saveMetaInsightSqlite } from '../db/database.js';

const GRAPH_API_BASE = 'https://graph.facebook.com/v20.0';

export interface MetaActionItem {
  action_type: string;
  value: string | number;
}

export interface MetaInsightRecord {
  date_start: string;
  date_stop: string;
  campaign_id: string;
  campaign_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  actions?: MetaActionItem[];
  action_values?: MetaActionItem[];
}

export interface MetaInsightsApiResponse {
  data: MetaInsightRecord[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
  };
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export class MetaAdsIntegrationService {
  private adAccountId: string;

  constructor() {
    this.adAccountId = process.env.META_AD_ACCOUNT_ID || '';
  }

  /**
   * Salva configurações do Meta Ads com criptografia AES-256
   */
  async saveConfig(token: string, accountId: string): Promise<void> {
    const trimmedToken = token.trim();
    const cleanAccountId = accountId.trim().replace(/^act_/, '');

    if (trimmedToken) {
      const encrypted = encryptToken(trimmedToken);
      setConfig('meta_access_token', encrypted);
    }

    if (cleanAccountId) {
      setConfig('meta_ad_account_id', cleanAccountId);
      this.adAccountId = cleanAccountId;
    }

    const db = getAnalyticsDb();
    if (db && trimmedToken) {
      try {
        const encrypted = encryptToken(trimmedToken);
        await db
          .insert(integrationTokens)
          .values({
            provider: 'meta_ads',
            accessToken: encrypted,
            metadata: { accountId: cleanAccountId },
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: integrationTokens.provider,
            set: {
              accessToken: encrypted,
              metadata: { accountId: cleanAccountId },
              updatedAt: new Date()
            }
          });
      } catch (err: unknown) {
        console.warn('[Meta Ads Service] Aviso ao salvar no PostgreSQL:', err);
      }
    }
  }

  /**
   * Obtém status de configuração do Meta Ads
   */
  async getConfigStatus(): Promise<{ configured: boolean; accountId: string; source: string }> {
    const sqliteToken = getConfig('meta_access_token', '');
    const sqliteAccountId = getConfig('meta_ad_account_id', '') || this.adAccountId || process.env.META_AD_ACCOUNT_ID || '';
    const envToken = process.env.META_ACCESS_TOKEN || process.env.META_CLOUD_TOKEN || '';

    if (sqliteToken) {
      return { configured: true, accountId: sqliteAccountId, source: 'sqlite_vault' };
    }

    if (envToken) {
      return { configured: true, accountId: sqliteAccountId, source: 'environment' };
    }

    const db = getAnalyticsDb();
    if (db) {
      try {
        const record = await db.query.integrationTokens.findFirst({
          where: eq(integrationTokens.provider, 'meta_ads')
        });
        if (record && record.accessToken) {
          const meta = (record.metadata as any) || {};
          return { configured: true, accountId: meta.accountId || sqliteAccountId, source: 'postgresql' };
        }
      } catch {
        // Fallback
      }
    }

    return { configured: false, accountId: sqliteAccountId, source: 'none' };
  }

  /**
   * Obtém token de acesso válido para Meta Ads
   */
  async getValidAccessToken(): Promise<string> {
    const sqliteToken = getConfig('meta_access_token', '');
    if (sqliteToken) {
      return decryptToken(sqliteToken);
    }

    const envToken = process.env.META_ACCESS_TOKEN || process.env.META_CLOUD_TOKEN;
    const db = getAnalyticsDb();

    if (db) {
      const record = await db.query.integrationTokens.findFirst({
        where: eq(integrationTokens.provider, 'meta_ads')
      });
      if (record && record.accessToken) {
        return decryptToken(record.accessToken);
      }
    }

    if (envToken) return envToken;
    throw new Error('Meta Ads não autenticado. Configure o Token de Acesso do Meta no painel ou no .env');
  }

  /**
   * Formata identificador de conta de anúncios para act_{ID}
   */
  private formatAccountId(accountId?: string): string {
    const id = accountId || getConfig('meta_ad_account_id', '') || this.adAccountId || process.env.META_AD_ACCOUNT_ID || '';
    if (!id) {
      throw new Error('ID da conta de anúncios da Meta não configurado. Informe o ID no painel ou via META_AD_ACCOUNT_ID.');
    }
    return id.startsWith('act_') ? id : `act_${id}`;
  }

  /**
   * Extrai o número de compras / conversões do array de actions
   */
  extractPurchases(actions?: MetaActionItem[]): number {
    if (!actions || !Array.isArray(actions)) return 0;
    let totalPurchases = 0;

    for (const a of actions) {
      const type = (a.action_type || '').toLowerCase();
      // Foco em purchase, omni_purchase e compras externas
      if (type === 'purchase' || type === 'omni_purchase' || type === 'onsite_web_purchase') {
        totalPurchases += Number(a.value) || 0;
      }
    }

    return totalPurchases;
  }

  /**
   * Extrai o valor monetário de conversão do array de action_values
   */
  extractPurchaseValue(actionValues?: MetaActionItem[]): number {
    if (!actionValues || !Array.isArray(actionValues)) return 0;
    let totalValue = 0;

    for (const a of actionValues) {
      const type = (a.action_type || '').toLowerCase();
      if (type === 'purchase' || type === 'omni_purchase' || type === 'onsite_web_purchase') {
        totalValue += Number(a.value) || 0;
      }
    }

    return Number(totalValue.toFixed(2));
  }

  /**
   * Sincroniza métricas da Marketing API por intervalo de datas com paginação
   */
  async syncMetaInsights(
    since: string,
    until: string,
    customAccountId?: string
  ): Promise<{ totalSincronizados: number; period: { since: string; until: string } }> {
    const db = getAnalyticsDb();

    const token = await this.getValidAccessToken();
    const actId = this.formatAccountId(customAccountId);

    const fields = [
      'campaign_id',
      'campaign_name',
      'spend',
      'impressions',
      'clicks',
      'ctr',
      'cpc',
      'actions',
      'action_values'
    ].join(',');

    const timeRange = JSON.stringify({ since, until });
    let nextUrl: string | null =
      `${GRAPH_API_BASE}/${actId}/insights?level=campaign&time_increment=1&fields=${fields}&time_range=${encodeURIComponent(timeRange)}&limit=100`;

    let totalSincronizados = 0;

    while (nextUrl) {
      const res = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Validação de cabeçalhos de Rate Limiting da Meta
      const usageHeader = res.headers.get('x-business-use-case-usage') || res.headers.get('x-app-usage');
      if (usageHeader) {
        try {
          const usage = JSON.parse(usageHeader);
          if (usage && typeof usage === 'object') {
            const maxCallCount = Math.max(...Object.values(usage).map((u: any) => u?.[0]?.call_count || 0));
            if (maxCallCount > 85) {
              console.warn(`[Meta Ads Rate Limit Warning] Utilização alta da cota da Meta: ${maxCallCount}%. Aplicando sleep defensivo.`);
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }
        } catch {
          // Ignorar erro de parsing de header
        }
      }

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as MetaInsightsApiResponse;
        const msg = errJson.error?.message || `Erro HTTP ${res.status}`;
        throw new Error(`[Meta Insights API] Falha na consulta de insights: ${msg}`);
      }

      const json = (await res.json()) as MetaInsightsApiResponse;

      if (!json.data || json.data.length === 0) {
        break;
      }

      for (const item of json.data) {
        const dateStr = item.date_start;
        const spend = parseFloat(item.spend) || 0;
        const impressions = parseInt(item.impressions, 10) || 0;
        const clicks = parseInt(item.clicks, 10) || 0;
        const ctr = parseFloat(item.ctr) || 0;
        const cpc = parseFloat(item.cpc) || 0;
        const purchases = this.extractPurchases(item.actions);
        const purchaseValue = this.extractPurchaseValue(item.action_values);

        // 1. Salvar no SQLite local
        saveMetaInsightSqlite({
          date: dateStr,
          campaign_id: item.campaign_id,
          campaign_name: item.campaign_name || 'Campanha Sem Nome',
          spend,
          impressions,
          clicks,
          ctr: ctr / 100,
          cpc,
          purchases,
          purchase_value: purchaseValue
        });

        // 2. Se o PostgreSQL estiver ativo, salva em paralelo
        if (db) {
          try {
            await db
              .insert(metaAdInsights)
              .values({
                date: dateStr,
                campaignId: item.campaign_id,
                campaignName: item.campaign_name || 'Campanha Sem Nome',
                spend: spend.toFixed(2),
                impressions,
                clicks,
                ctr: (ctr / 100).toFixed(4),
                cpc: cpc.toFixed(2),
                purchases,
                purchaseValue: purchaseValue.toFixed(2),
                updatedAt: new Date()
              })
              .onConflictDoUpdate({
                target: [metaAdInsights.date, metaAdInsights.campaignId],
                set: {
                  campaignName: item.campaign_name || 'Campanha Sem Nome',
                  spend: spend.toFixed(2),
                  impressions,
                  clicks,
                  ctr: (ctr / 100).toFixed(4),
                  cpc: cpc.toFixed(2),
                  purchases,
                  purchaseValue: purchaseValue.toFixed(2),
                  updatedAt: new Date()
                }
              });
          } catch (errDb: unknown) {
            console.warn('[Meta Ads Service] Aviso ao persistir no PostgreSQL:', errDb);
          }
        }

        totalSincronizados++;
      }

      nextUrl = json.paging?.next || null;
    }

    console.log(`[Meta Ads Service] Sincronização concluída: ${totalSincronizados} registros diários persistidos no período ${since} a ${until}.`);
    return { totalSincronizados, period: { since, until } };
  }
}

export const metaAdsService = new MetaAdsIntegrationService();
