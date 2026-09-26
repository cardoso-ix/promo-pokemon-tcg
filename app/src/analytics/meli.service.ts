import { eq } from 'drizzle-orm';
import { getAnalyticsDb } from './db.js';
import { integrationTokens, meliOrders } from './schema.js';
import { encryptToken, decryptToken } from './security.js';
import { getConfig, setConfig, saveMeliOrderSqlite, getMeliOrdersStats } from '../db/database.js';

const MELI_AUTH_URL = 'https://api.mercadolibre.com/oauth/token';
const MELI_API_BASE = 'https://api.mercadolibre.com';

export interface MeliTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
}

export interface MeliOrderItem {
  item: { id: string; title: string; category_id?: string };
  quantity: number;
  unit_price: number;
  full_unit_price: number;
  sale_fee?: number;
}

export interface MeliPayment {
  id: number;
  transaction_amount: number;
  total_paid_amount: number;
  marketplace_fee?: number;
  shipping_cost?: number;
  status: string;
}

export interface MeliOrderPayload {
  id: number | string;
  date_created: string;
  date_closed?: string | null;
  total_amount: number;
  paid_amount?: number;
  status: string;
  currency_id?: string;
  buyer?: { id: number; nickname?: string };
  order_items?: MeliOrderItem[];
  payments?: MeliPayment[];
  shipping?: { id?: number; cost?: number };
}

export interface MeliOrderSearchResponse {
  results: MeliOrderPayload[];
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
}

export class MeliIntegrationService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.MELI_APP_ID || process.env.MELI_CLIENT_ID || '';
    this.clientSecret = process.env.MELI_CLIENT_SECRET || '';
    this.redirectUri = process.env.MELI_REDIRECT_URI || 'http://localhost:3000/api/integrations/meli/callback';
  }

  /**
   * Salva configurações e credenciais do Mercado Livre
   */
  async saveConfig(dados: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    userId?: number;
    redirectUri?: string;
  }): Promise<void> {
    if (dados.clientId?.trim()) {
      const trimmed = dados.clientId.trim();
      setConfig('meli_client_id', trimmed);
      this.clientId = trimmed;
    }
    if (dados.clientSecret?.trim()) {
      const trimmed = dados.clientSecret.trim();
      setConfig('meli_client_secret', encryptToken(trimmed));
      this.clientSecret = trimmed;
    }
    if (dados.redirectUri?.trim()) {
      const trimmed = dados.redirectUri.trim();
      setConfig('meli_redirect_uri', trimmed);
      this.redirectUri = trimmed;
    }
    if (dados.userId) {
      setConfig('meli_user_id', String(dados.userId));
    }
    if (dados.accessToken?.trim()) {
      const enc = encryptToken(dados.accessToken.trim());
      setConfig('meli_access_token', enc);
      setConfig('meli_token_expires_at', new Date(Date.now() + 6 * 3600 * 1000).toISOString());
    }
    if (dados.refreshToken?.trim()) {
      const enc = encryptToken(dados.refreshToken.trim());
      setConfig('meli_refresh_token', enc);
    }

    // Salvar no PostgreSQL se conectado
    const db = getAnalyticsDb();
    if (db && dados.accessToken?.trim()) {
      try {
        const encAccess = encryptToken(dados.accessToken.trim());
        const encRefresh = dados.refreshToken ? encryptToken(dados.refreshToken.trim()) : null;
        await db
          .insert(integrationTokens)
          .values({
            provider: 'mercadolivre',
            accessToken: encAccess,
            refreshToken: encRefresh,
            tokenExpiresAt: new Date(Date.now() + 6 * 3600 * 1000),
            metadata: { userId: dados.userId, clientId: dados.clientId },
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: integrationTokens.provider,
            set: {
              accessToken: encAccess,
              refreshToken: encRefresh,
              tokenExpiresAt: new Date(Date.now() + 6 * 3600 * 1000),
              metadata: { userId: dados.userId, clientId: dados.clientId },
              updatedAt: new Date()
            }
          });
      } catch (err: unknown) {
        console.warn('[Meli Service] Aviso ao salvar no PostgreSQL:', err);
      }
    }
  }

  /**
   * Gera a URL oficial de autorização OAuth do Mercado Livre
   */
  getAuthUrl(customRedirectUri?: string): string {
    const cid = getConfig('meli_client_id', '') || this.clientId;
    if (!cid) {
      throw new Error('Configure o App ID (Client ID) do Mercado Livre antes de iniciar o OAuth');
    }
    const rUri = getConfig('meli_redirect_uri', '') || customRedirectUri || this.redirectUri || 'https://108-174-145-77.sslip.io/api/integrations/meli/callback';
    return `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${cid}&redirect_uri=${encodeURIComponent(rUri)}`;
  }

  /**
   * Troca authorization code por access_token e refresh_token
   */
  async exchangeCodeForToken(code: string, customRedirectUri?: string): Promise<MeliTokenResponse> {
    const cid = getConfig('meli_client_id', '') || this.clientId;
    const encSecret = getConfig('meli_client_secret', '');
    const cSecret = encSecret ? decryptToken(encSecret) : this.clientSecret;
    const rUri = getConfig('meli_redirect_uri', '') || customRedirectUri || this.redirectUri || 'https://108-174-145-77.sslip.io/api/integrations/meli/callback';

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: cid,
      client_secret: cSecret,
      code,
      redirect_uri: rUri
    });

    const res = await fetch(MELI_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[Meli OAuth] Falha ao trocar code por token (${res.status}): ${err}`);
    }

    const data = (await res.json()) as MeliTokenResponse;
    await this.saveTokens(data);
    return data;
  }

  /**
   * Salva os tokens no banco com criptografia (SQLite + PostgreSQL)
   */
  async saveTokens(tokens: MeliTokenResponse): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const encAccess = encryptToken(tokens.access_token);
    const encRefresh = encryptToken(tokens.refresh_token);

    setConfig('meli_access_token', encAccess);
    setConfig('meli_refresh_token', encRefresh);
    setConfig('meli_token_expires_at', expiresAt.toISOString());
    setConfig('meli_user_id', String(tokens.user_id));

    const db = getAnalyticsDb();
    if (db) {
      try {
        await db
          .insert(integrationTokens)
          .values({
            provider: 'mercadolivre',
            accessToken: encAccess,
            refreshToken: encRefresh,
            tokenExpiresAt: expiresAt,
            metadata: {
              userId: tokens.user_id,
              scope: tokens.scope,
              tokenType: tokens.token_type
            },
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: integrationTokens.provider,
            set: {
              accessToken: encAccess,
              refreshToken: encRefresh,
              tokenExpiresAt: expiresAt,
              metadata: {
                userId: tokens.user_id,
                scope: tokens.scope,
                tokenType: tokens.token_type
              },
              updatedAt: new Date()
            }
          });
      } catch (err: unknown) {
        console.warn('[Meli Service] Erro ao persistir tokens no PostgreSQL:', err);
      }
    }

    console.log(`[Meli Service] Tokens do Mercado Livre persistidos (Expira em: ${expiresAt.toISOString()})`);
  }

  /**
   * Obtém token de acesso válido, renovando automaticamente se estiver prestes a expirar
   */
  async getValidAccessToken(): Promise<string> {
    // 1. Tentar SQLite Vault (Criptografado com AES-256-GCM)
    const encSqliteToken = getConfig('meli_access_token', '');
    if (encSqliteToken) {
      const expiresAtIso = getConfig('meli_token_expires_at', '');
      const expiresAt = expiresAtIso ? new Date(expiresAtIso).getTime() : 0;
      const now = Date.now();
      const marginMs = 15 * 60 * 1000; // 15 minutos

      if (expiresAt > 0 && now + marginMs >= expiresAt) {
        const encRefresh = getConfig('meli_refresh_token', '');
        if (encRefresh) {
          console.log('[Meli Service] Access token expirado ou próximo de expirar. Renovando automaticamente...');
          const decryptedRefresh = decryptToken(encRefresh);
          if (decryptedRefresh) {
            return this.refreshAccessToken(decryptedRefresh);
          }
        }
      }

      const decrypted = decryptToken(encSqliteToken);
      if (decrypted) return decrypted;
    }

    // 2. Tentar variável de ambiente
    const envToken = process.env.MELI_ACCESS_TOKEN;
    if (envToken) return envToken;

    // 3. Tentar PostgreSQL (se conectado)
    const db = getAnalyticsDb();
    if (db) {
      const record = await db.query.integrationTokens.findFirst({
        where: eq(integrationTokens.provider, 'mercadolivre')
      });
      if (record) {
        const decrypted = decryptToken(record.accessToken);
        if (decrypted) return decrypted;
      }
    }

    throw new Error('Mercado Livre não autenticado. Realize a autorização ou informe o Access Token.');
  }

  /**
   * Renova o access_token usando o refresh_token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    const cid = getConfig('meli_client_id', '') || this.clientId;
    const encSecret = getConfig('meli_client_secret', '');
    const cSecret = encSecret ? decryptToken(encSecret) : this.clientSecret;

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: cid,
      client_secret: cSecret,
      refresh_token: refreshToken
    });

    const res = await fetch(MELI_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[Meli OAuth] Falha ao renovar token com refresh_token (${res.status}): ${err}`);
    }

    const data = (await res.json()) as MeliTokenResponse;
    await this.saveTokens(data);
    return data.access_token;
  }

  /**
   * Obtém status da integração do Mercado Livre
   */
  async getConfigStatus(currentHost = 'http://localhost:3000'): Promise<{
    configured: boolean;
    userId: string;
    clientId: string;
    webhookUrl: string;
    tokenExpiresAt: string;
  }> {
    const encToken = getConfig('meli_access_token', '');
    const userId = getConfig('meli_user_id', '') || process.env.MELI_USER_ID || '';
    const clientId = getConfig('meli_client_id', '') || this.clientId || '';
    const tokenExpiresAt = getConfig('meli_token_expires_at', '');
    const envToken = process.env.MELI_ACCESS_TOKEN || '';

    const configured = Boolean(encToken || envToken);
    const webhookUrl = `${currentHost}/api/webhooks/mercadolivre`;

    return {
      configured,
      userId,
      clientId,
      webhookUrl,
      tokenExpiresAt
    };
  }

  /**
   * Consulta e extrai pedidos por intervalo de data com paginação
   */
  async syncMeliOrders(dateFrom: Date, dateTo: Date): Promise<{ totalEncontrados: number; totalProcessados: number }> {
    const accessToken = await this.getValidAccessToken();
    const fromIso = dateFrom.toISOString();
    const toIso = dateTo.toISOString();

    let offset = 0;
    const limit = 50;
    let totalEncontrados = 0;
    let totalProcessados = 0;
    let hasMore = true;

    while (hasMore) {
      const url = `${MELI_API_BASE}/orders/search?order.date_created.from=${encodeURIComponent(fromIso)}&order.date_created.to=${encodeURIComponent(toIso)}&offset=${offset}&limit=${limit}&sort=date_desc`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`[Meli Orders Search] Erro HTTP ${res.status}: ${errText}`);
      }

      const data = (await res.json()) as MeliOrderSearchResponse;
      totalEncontrados = data.paging.total;

      for (const order of data.results) {
        await this.upsertOrder(order);
        totalProcessados++;
      }

      offset += limit;
      if (offset >= totalEncontrados || data.results.length === 0) {
        hasMore = false;
      }
    }

    console.log(`[Meli Service] Sincronização concluída: ${totalProcessados}/${totalEncontrados} pedidos persistidos.`);
    return { totalEncontrados, totalProcessados };
  }

  /**
   * Consulta um pedido específico por ID e realiza upsert imediato
   */
  async fetchAndSaveOrderById(orderId: string | number): Promise<void> {
    const accessToken = await this.getValidAccessToken();
    const url = `${MELI_API_BASE}/orders/${orderId}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[Meli Fetch Order] Falha ao buscar pedido #${orderId} (${res.status}): ${err}`);
    }

    const order = (await res.json()) as MeliOrderPayload;
    await this.upsertOrder(order);
  }

  /**
   * Realiza o upsert de um pedido no SQLite e PostgreSQL calculando taxas de venda e frete
   */
  async upsertOrder(order: MeliOrderPayload): Promise<void> {
    const orderIdStr = String(order.id);
    const dateCreatedStr = order.date_created || new Date().toISOString();
    const dateClosedStr = order.date_closed || null;
    const totalAmount = Number(order.total_amount) || 0;

    let paidAmount = 0;
    let marketplaceFee = 0;
    let shippingCost = Number(order.shipping?.cost) || 0;

    if (order.payments && Array.isArray(order.payments)) {
      for (const p of order.payments) {
        if (p.status === 'approved') {
          paidAmount += Number(p.total_paid_amount) || Number(p.transaction_amount) || 0;
          if (p.marketplace_fee) {
            marketplaceFee += Number(p.marketplace_fee);
          }
          if (p.shipping_cost && !shippingCost) {
            shippingCost = Number(p.shipping_cost);
          }
        }
      }
    }

    if (marketplaceFee === 0 && order.order_items && Array.isArray(order.order_items)) {
      for (const item of order.order_items) {
        if (item.sale_fee) {
          marketplaceFee += Number(item.sale_fee);
        }
      }
    }

    const buyerId = order.buyer?.id ? String(order.buyer.id) : null;
    const buyerNickname = order.buyer?.nickname || null;
    const currencyId = order.currency_id || 'BRL';

    // 1. Salvar no SQLite local (replica.db)
    saveMeliOrderSqlite({
      order_id: orderIdStr,
      date_created: dateCreatedStr,
      date_closed: dateClosedStr,
      total_amount: totalAmount,
      paid_amount: paidAmount > 0 ? paidAmount : totalAmount,
      marketplace_fee: marketplaceFee,
      shipping_cost: shippingCost,
      status: order.status || 'confirmed',
      buyer_id: buyerId,
      buyer_nickname: buyerNickname,
      currency_id: currencyId,
      raw_data: order
    });

    // 2. Salvar no PostgreSQL (se disponível)
    const db = getAnalyticsDb();
    if (db) {
      try {
        await db
          .insert(meliOrders)
          .values({
            orderId: orderIdStr,
            dateCreated: new Date(dateCreatedStr),
            dateClosed: dateClosedStr ? new Date(dateClosedStr) : null,
            totalAmount: totalAmount.toFixed(2),
            paidAmount: (paidAmount > 0 ? paidAmount : totalAmount).toFixed(2),
            marketplaceFee: marketplaceFee.toFixed(2),
            shippingCost: shippingCost.toFixed(2),
            status: order.status || 'confirmed',
            buyerId,
            currencyId,
            rawData: order,
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: meliOrders.orderId,
            set: {
              dateClosed: dateClosedStr ? new Date(dateClosedStr) : null,
              totalAmount: totalAmount.toFixed(2),
              paidAmount: (paidAmount > 0 ? paidAmount : totalAmount).toFixed(2),
              marketplaceFee: marketplaceFee.toFixed(2),
              shippingCost: shippingCost.toFixed(2),
              status: order.status || 'confirmed',
              buyerId,
              rawData: order,
              updatedAt: new Date()
            }
          });
      } catch (err: unknown) {
        console.warn('[Meli Service] Erro ao sincronizar pedido no PostgreSQL:', err);
      }
    }
  }

  /**
   * Processador de eventos de Webhook do Mercado Livre em Tempo Real
   */
  async handleWebhook(body: { topic?: string; resource?: string; user_id?: number }): Promise<{ processed: boolean; orderId?: string }> {
    const topic = body.topic || '';
    const resource = body.resource || '';

    if (topic === 'orders_v2' || resource.startsWith('/orders/')) {
      const orderId = resource.replace('/orders/', '').trim();
      if (orderId && /^\d+$/.test(orderId)) {
        console.log(`[Meli Webhook] Nova notificação em tempo real para o pedido #${orderId}! Processando...`);
        await this.fetchAndSaveOrderById(orderId);
        return { processed: true, orderId };
      }
    }

    return { processed: false };
  }
}

export const meliService = new MeliIntegrationService();
