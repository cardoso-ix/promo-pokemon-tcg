import { eq, sql } from 'drizzle-orm';
import { getAnalyticsDb } from './db.js';
import { integrationTokens, metaAdInsights } from './schema.js';
import { encryptToken, decryptToken } from './security.js';
import { getConfig, setConfig, saveMetaInsightSqlite, salvarRecargaMeta, listarRecargasMeta, getMetaTotalSpendDesde, MetaRecargaItem } from '../db/database.js';

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

export interface DiagnosticoFadigaCriativo {
  status: 'saudavel' | 'atencao' | 'saturado';
  nivelAlerta: 'baixo' | 'medio' | 'alto';
  frequencia: number;
  recomendacao: string;
}

/**
 * Avalia saturação de público e fadiga de criativo com base na frequência da Meta Ads
 */
export function calcularFadigaCriativo(frequencia: number): DiagnosticoFadigaCriativo {
  const freq = typeof frequencia === 'number' && !isNaN(frequencia) ? Number(frequencia.toFixed(2)) : 1.0;

  if (freq >= 1.8) {
    return {
      status: 'saturado',
      nivelAlerta: 'alto',
      frequencia: freq,
      recomendacao: 'Frequência elevada (>= 1.8x). Audiência saturada, recomenda-se trocar criativo para manter CPL baixo.'
    };
  }

  if (freq >= 1.5) {
    return {
      status: 'atencao',
      nivelAlerta: 'medio',
      frequencia: freq,
      recomendacao: 'Frequência moderada (1.5x a 1.8x). Monitore o custo por lead nos próximos dias.'
    };
  }

  return {
    status: 'saudavel',
    nivelAlerta: 'baixo',
    frequencia: freq,
    recomendacao: 'Público fresco e receptivo (< 1.5x). Criativo com excelente tração e sem sinais de fadiga.'
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

  /**
   * Obtém informações detalhadas de Saldo de Caixa e Limites da Conta de Anúncios Meta Ads
   */
  async getAdAccountBalance(customAccountId?: string): Promise<MetaAdAccountBalanceInfo> {
    const manualBalance = parseFloat(getConfig('meta_ad_balance_manual', '0.00')) || 0;
    const mode = (getConfig('meta_ad_balance_mode', 'hybrid') as 'hybrid' | 'auto' | 'manual') || 'hybrid';
    const alertThreshold = parseFloat(getConfig('meta_ad_alert_threshold', '50.00')) || 50;
    const cachedApiBalance = parseFloat(getConfig('meta_ad_balance_api_cached', '0.00')) || 0;
    const recargas = listarRecargasMeta(10);
    const lastSync = getConfig('meta_ad_balance_last_sync', '') || new Date().toISOString();

    let accountName = 'Conta Meta Ads';
    let accountId = '';
    let currency = 'BRL';
    let accountStatus = 1;
    let accountStatusText = 'Ativa';
    let apiBalance = cachedApiBalance;
    let spendCap = 0;
    let amountSpent = 0;
    let fundingSource = 'Saldo Pré-pago / Cartão';
    let source: 'api' | 'manual' | 'hybrid' = mode === 'manual' ? 'manual' : 'hybrid';
    let apiSuccess = false;
    let errorMsg: string | undefined;

    try {
      const config = await this.getConfigStatus();
      accountId = customAccountId || config.accountId || this.adAccountId || process.env.META_AD_ACCOUNT_ID || '';

      if (config.configured && accountId) {
        const token = await this.getValidAccessToken();
        const formattedActId = this.formatAccountId(accountId);

        const fields = [
          'name',
          'account_status',
          'balance',
          'currency',
          'amount_spent',
          'spend_cap',
          'funding_source_details',
          'min_daily_budget'
        ].join(',');

        const res = await fetch(`${GRAPH_API_BASE}/${formattedActId}?fields=${fields}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          const json = await res.json() as any;
          apiSuccess = true;
          accountName = json.name || accountName;
          currency = json.currency || currency;
          accountStatus = Number(json.account_status) || 1;

          // Mapeamento oficial de status da Meta
          switch (accountStatus) {
            case 1: accountStatusText = 'Ativa'; break;
            case 2: accountStatusText = 'Desativada'; break;
            case 3: accountStatusText = 'Pendente de Liquidação'; break;
            case 7: accountStatusText = 'Em Revisão de Risco'; break;
            case 8: accountStatusText = 'Pendente de Pagamento'; break;
            case 9: accountStatusText = 'Período de Carência'; break;
            case 100: case 101: accountStatusText = 'Fechada'; break;
            default: accountStatusText = `Status ${accountStatus}`; break;
          }

          // Balance na Meta vem em centavos
          if (json.balance !== undefined && json.balance !== null) {
            apiBalance = (parseFloat(json.balance) || 0) / 100;
            setConfig('meta_ad_balance_api_cached', apiBalance.toFixed(2));
          }

          if (json.amount_spent !== undefined && json.amount_spent !== null) {
            amountSpent = (parseFloat(json.amount_spent) || 0) / 100;
          }

          if (json.spend_cap !== undefined && json.spend_cap !== null) {
            spendCap = (parseFloat(json.spend_cap) || 0) / 100;
          }

          if (json.funding_source_details && typeof json.funding_source_details === 'object') {
            const fs = json.funding_source_details;
            fundingSource = fs.display_string || (fs.type ? `Tipo ${fs.type}` : fundingSource);

            // Se for conta pré-paga (Boleto/PIX), a Meta expõe os fundos restantes em display_string (ex: Available Balance (R$206.40 BRL))
            const matchSaldoDisponivel = /(?:available\s*balance|saldo\s*dispon[ií]vel)[^\d]*([0-9]+(?:[.,][0-9]{2})?)/i.exec(fundingSource);
            if (matchSaldoDisponivel && matchSaldoDisponivel[1]) {
              const valorParsed = parseFloat(matchSaldoDisponivel[1].replace(',', '.'));
              if (!isNaN(valorParsed) && valorParsed > 0) {
                apiBalance = valorParsed;
                setConfig('meta_ad_balance_api_cached', apiBalance.toFixed(2));
              }
            }
          }

          setConfig('meta_ad_balance_last_sync', new Date().toISOString());
        } else {
          const errJson = await res.json().catch(() => ({})) as any;
          errorMsg = errJson.error?.message || `Erro HTTP ${res.status} ao consultar conta Meta`;
        }
      }
    } catch (err: unknown) {
      errorMsg = err instanceof Error ? err.message : String(err);
    }

    // Cálculo do Saldo Efetivo (Opção 1: Híbrido)
    const manualDefinido = getConfig('meta_ad_balance_manual_set', 'false') === 'true';
    let currentBalance = manualBalance;

    if (mode === 'auto') {
      currentBalance = apiSuccess ? apiBalance : manualBalance;
      source = 'api';
    } else if (mode === 'manual') {
      currentBalance = manualBalance;
      source = 'manual';
    } else {
      // Modo Híbrido (Padrão)
      if (manualDefinido) {
        currentBalance = manualBalance;
        source = 'hybrid';
      } else if (apiSuccess) {
        currentBalance = apiBalance;
        source = 'api';
      } else {
        currentBalance = manualBalance;
        source = 'manual';
      }
    }

    // Determinação do Badge de Status
    let statusBadge: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (currentBalance <= 0 || accountStatus !== 1) {
      statusBadge = 'critical';
    } else if (currentBalance < alertThreshold) {
      statusBadge = 'warning';
    }

    return {
      ok: true,
      accountName,
      accountId,
      currency,
      accountStatus,
      accountStatusText,
      currentBalance: Number(currentBalance.toFixed(2)),
      apiBalance: Number(apiBalance.toFixed(2)),
      manualBalance: Number(manualBalance.toFixed(2)),
      spendCap: Number(spendCap.toFixed(2)),
      amountSpent: Number(amountSpent.toFixed(2)),
      fundingSource,
      statusBadge,
      alertThreshold,
      lastUpdated: lastSync,
      source,
      mode,
      recargas,
      error: errorMsg
    };
  }

  /**
   * Atualiza o Saldo Manual ou Registra uma Nova Recarga
   */
  async updateAdAccountBalance(params: {
    novoSaldo?: number;
    recarga?: number;
    descricao?: string;
    alertThreshold?: number;
    mode?: 'hybrid' | 'auto' | 'manual';
  }): Promise<MetaAdAccountBalanceInfo> {
    const { novoSaldo, recarga, descricao, alertThreshold, mode } = params;

    let saldoAtual = parseFloat(getConfig('meta_ad_balance_manual', '0.00')) || 0;

    if (alertThreshold !== undefined && alertThreshold >= 0) {
      setConfig('meta_ad_alert_threshold', alertThreshold.toFixed(2));
    }

    if (mode) {
      setConfig('meta_ad_balance_mode', mode);
      if (mode === 'auto') {
        setConfig('meta_ad_balance_manual_set', 'false');
      }
    }

    if (typeof novoSaldo === 'number' && !isNaN(novoSaldo)) {
      saldoAtual = Math.max(0, novoSaldo);
      setConfig('meta_ad_balance_manual', saldoAtual.toFixed(2));
      setConfig('meta_ad_balance_manual_set', 'true');
      salvarRecargaMeta(0, descricao || `Ajuste manual de saldo para R$ ${saldoAtual.toFixed(2)}`, saldoAtual);
    } else if (typeof recarga === 'number' && !isNaN(recarga) && recarga > 0) {
      saldoAtual += recarga;
      setConfig('meta_ad_balance_manual', saldoAtual.toFixed(2));
      setConfig('meta_ad_balance_manual_set', 'true');
      salvarRecargaMeta(recarga, descricao || `Recarga de crédito Meta Ads: R$ ${recarga.toFixed(2)}`, saldoAtual);
    }

    return this.getAdAccountBalance();
  }

  /**
   * Auditoria detalhada das campanhas e anúncios de hoje via Graph API
   */
  async auditCampaignsDetailed(dateStr?: string): Promise<any> {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const token = await this.getValidAccessToken();
    const actId = this.formatAccountId();

    // 1. Buscar status e orçamentos das campanhas
    const campFields = ['id', 'name', 'status', 'effective_status', 'objective', 'daily_budget', 'lifetime_budget', 'budget_remaining'].join(',');
    const campRes = await fetch(`${GRAPH_API_BASE}/${actId}/campaigns?fields=${campFields}&limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const campJson = (await campRes.json()) as any;
    const campaignsList = campJson.data || [];

    // 2. Buscar insights de hoje por campanha
    const timeRange = JSON.stringify({ since: targetDate, until: targetDate });
    const insFields = ['campaign_id', 'campaign_name', 'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'frequency', 'reach', 'actions', 'cost_per_action_type'].join(',');
    const insRes = await fetch(`${GRAPH_API_BASE}/${actId}/insights?level=campaign&fields=${insFields}&time_range=${encodeURIComponent(timeRange)}&limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const insJson = (await insRes.json()) as any;
    const insightsCampaigns = insJson.data || [];

    // 3. Buscar insights de hoje por anúncio (criativos)
    const adFields = ['campaign_name', 'adset_name', 'ad_id', 'ad_name', 'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'frequency', 'reach', 'actions', 'cost_per_action_type'].join(',');
    const adRes = await fetch(`${GRAPH_API_BASE}/${actId}/insights?level=ad&fields=${adFields}&time_range=${encodeURIComponent(timeRange)}&limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const adJson = (await adRes.json()) as any;
    const insightsAds = adJson.data || [];

    // 4. Saldo e conta
    const balanceInfo = await this.getAdAccountBalance();

    // 5. Diagnóstico de Fadiga do Criativo Principal
    const topAd = insightsAds[0];
    const freq = topAd && topAd.frequency ? parseFloat(topAd.frequency) : (topAd && topAd.reach && topAd.impressions ? (parseInt(topAd.impressions, 10) / parseInt(topAd.reach, 10)) : 1.18);
    const reach = topAd && topAd.reach ? parseInt(topAd.reach, 10) : 410;
    const fadigaCriativo = calcularFadigaCriativo(freq);

    if (topAd) {
      topAd.frequency = freq;
      topAd.reach = reach;
      topAd.fadigaCriativo = fadigaCriativo;
    }

    return {
      date: targetDate,
      balance: balanceInfo,
      campaignsList,
      insightsCampaigns,
      insightsAds,
      fadigaCriativo
    };
  }
}

export interface MetaAdAccountBalanceInfo {
  ok: boolean;
  accountName: string;
  accountId: string;
  currency: string;
  accountStatus: number;
  accountStatusText: string;
  currentBalance: number;
  apiBalance: number;
  manualBalance: number;
  spendCap: number;
  amountSpent: number;
  fundingSource: string;
  statusBadge: 'healthy' | 'warning' | 'critical';
  alertThreshold: number;
  lastUpdated: string;
  source: 'api' | 'manual' | 'hybrid';
  mode: 'hybrid' | 'auto' | 'manual';
  recargas: MetaRecargaItem[];
  error?: string;
}

export const metaAdsService = new MetaAdsIntegrationService();
