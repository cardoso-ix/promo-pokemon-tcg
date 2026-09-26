import { eq } from 'drizzle-orm';
import { getAnalyticsDb } from './db.js';
import { integrationTokens, meliOrders } from './schema.js';
import { encryptToken, decryptToken } from './security.js';

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
  id: number;
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
   * Troca authorization code por access_token e refresh_token
   */
  async exchangeCodeForToken(code: string): Promise<MeliTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.redirectUri
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
   * Salva os tokens no banco com criptografia
   */
  async saveTokens(tokens: MeliTokenResponse): Promise<void> {
    const db = getAnalyticsDb();
    if (!db) {
      console.warn('[Meli Service] Banco não conectado. Tokens não foram persistidos no PostgreSQL.');
      return;
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const encAccess = encryptToken(tokens.access_token);
    const encRefresh = encryptToken(tokens.refresh_token);

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

    console.log(`[Meli Service] Tokens do Mercado Livre persistidos (Expira em: ${expiresAt.toISOString()})`);
  }

  /**
   * Obtém token de acesso válido, renovando automaticamente se estiver prestes a expirar
   */
  async getValidAccessToken(): Promise<string> {
    const db = getAnalyticsDb();

    // Fallback: Token estático direto de variável de ambiente (se fornecido)
    const envToken = process.env.MELI_ACCESS_TOKEN;
    if (!db) {
      if (envToken) return envToken;
      throw new Error('Nenhum banco ou MELI_ACCESS_TOKEN configurado no .env');
    }

    const record = await db.query.integrationTokens.findFirst({
      where: eq(integrationTokens.provider, 'mercadolivre')
    });

    if (!record) {
      if (envToken) return envToken;
      throw new Error('Mercado Livre não autenticado. Realize a autorização em /api/integrations/meli/auth');
    }

    const expiresAt = record.tokenExpiresAt ? new Date(record.tokenExpiresAt).getTime() : 0;
    const now = Date.now();
    // Renova se faltar menos de 10 minutos para expirar
    const marginMs = 10 * 60 * 1000;

    if (now + marginMs >= expiresAt) {
      console.log('[Meli Service] Access token expirado ou próximo de expirar. Renovando com refresh_token...');
      const decryptedRefresh = decryptToken(record.refreshToken || '');
      if (!decryptedRefresh) {
        throw new Error('Refresh token indisponível para renovação automática do Mercado Livre');
      }
      return this.refreshAccessToken(decryptedRefresh);
    }

    return decryptToken(record.accessToken);
  }

  /**
   * Renova o access_token usando o refresh_token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
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
   * Consulta e extrai pedidos por intervalo de data com paginação
   */
  async syncMeliOrders(dateFrom: Date, dateTo: Date): Promise<{ totalEncontrados: number; totalProcessados: number }> {
    const db = getAnalyticsDb();
    if (!db) {
      throw new Error('PostgreSQL indisponível para sincronização de pedidos do Mercado Livre');
    }

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
   * Consulta um pedido específico por ID e realiza upsert
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
      throw new Error(`[Meli Fetch Order] Falha ao buscar pedido ${orderId} (${res.status}): ${err}`);
    }

    const order = (await res.json()) as MeliOrderPayload;
    await this.upsertOrder(order);
  }

  /**
   * Realiza o upsert de um pedido no PostgreSQL calculando taxas de venda e frete
   */
  async upsertOrder(order: MeliOrderPayload): Promise<void> {
    const db = getAnalyticsDb();
    if (!db) return;

    const orderIdStr = String(order.id);
    const dateCreated = new Date(order.date_created);
    const dateClosed = order.date_closed ? new Date(order.date_closed) : null;
    const totalAmount = order.total_amount || 0;

    // 1. Calcula paidAmount somando pagamentos aprovados
    let paidAmount = 0;
    let marketplaceFee = 0;
    let shippingCost = order.shipping?.cost || 0;

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

    // 2. Se marketplace_fee não vier nos payments, calcula via order_items.sale_fee
    if (marketplaceFee === 0 && order.order_items && Array.isArray(order.order_items)) {
      for (const item of order.order_items) {
        if (item.sale_fee) {
          marketplaceFee += Number(item.sale_fee);
        }
      }
    }

    const buyerId = order.buyer?.id ? String(order.buyer.id) : null;
    const currencyId = order.currency_id || 'BRL';

    await db
      .insert(meliOrders)
      .values({
        orderId: orderIdStr,
        dateCreated,
        dateClosed,
        totalAmount: totalAmount.toFixed(2),
        paidAmount: paidAmount > 0 ? paidAmount.toFixed(2) : totalAmount.toFixed(2),
        marketplaceFee: marketplaceFee.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        status: order.status,
        buyerId,
        currencyId,
        rawData: order,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: meliOrders.orderId,
        set: {
          dateClosed,
          totalAmount: totalAmount.toFixed(2),
          paidAmount: paidAmount > 0 ? paidAmount.toFixed(2) : totalAmount.toFixed(2),
          marketplaceFee: marketplaceFee.toFixed(2),
          shippingCost: shippingCost.toFixed(2),
          status: order.status,
          buyerId,
          rawData: order,
          updatedAt: new Date()
        }
      });
  }

  /**
   * Processador de eventos de Webhook do Mercado Livre
   */
  async handleWebhook(body: { topic?: string; resource?: string; user_id?: number }): Promise<void> {
    const topic = body.topic || '';
    const resource = body.resource || '';

    // Notificações de pedidos: topic "orders_v2" ou resource contendo "/orders/"
    if (topic === 'orders_v2' || resource.startsWith('/orders/')) {
      const orderId = resource.replace('/orders/', '').trim();
      if (orderId && /^\d+$/.test(orderId)) {
        console.log(`[Meli Webhook] Notificação recebida para o pedido #${orderId}. Atualizando dados...`);
        await this.fetchAndSaveOrderById(orderId);
      }
    }
  }
}

export const meliService = new MeliIntegrationService();
