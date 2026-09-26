import { getConfig, setConfig, db } from '../db/database.js';

export interface MeliAffiliateOverview {
  tag: string;
  totalClicks: number;
  totalBuyers: number;
  totalRequests: number;
  totalOrders: number;
  totalSales: number; // Volume total de vendas geradas (R$)
  totalCommissions: number; // Total de comissões em reais (R$)
  cvr: number; // Taxa de conversão (ex: 0.0467 -> 4.67%)
  commissionsToday: number;
  ordersToday: number;
  recentSales: Array<{
    id: string;
    date: string;
    productName: string;
    productImage: string;
    link: string;
    storeName: string;
    saleValue: number;
    saleUnits: number;
    commissionValue: number;
    commissionPercentage: number;
  }>;
  dailyData: Array<{
    date: string;
    orders: number;
    quantity: number;
    earnings: number;
    touchpoints: number;
    cvr: number;
  }>;
  updatedAt: string;
}

const MELI_AFFILIATE_BASE = 'https://www.mercadolivre.com.br/affiliate-program/api';

export class MeliAffiliateService {
  private cache: MeliAffiliateOverview | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos em memória

  constructor() {
    this.initDatabaseTable();
  }

  private initDatabaseTable() {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS meli_affiliate_cache (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          data_json TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (err) {
      console.warn('[Meli Affiliate] Erro ao criar tabela meli_affiliate_cache:', err);
    }
  }

  /**
   * Verifica se o cookie de sessão está configurado
   */
  isConnected(): boolean {
    const cookie = getConfig('meli_cookie', '').trim();
    return cookie.length > 20;
  }

  /**
   * Salva um novo cookie de sessão no banco
   */
  saveCookie(cookie: string) {
    setConfig('meli_cookie', cookie.trim());
    this.cache = null;
    this.lastFetchTime = 0;
  }

  /**
   * Obtém os headers autenticados com a sessão ativa de cookies
   */
  private getHeaders(): Record<string, string> {
    const cookie = getConfig('meli_cookie', '').trim();
    if (!cookie) {
      throw new Error('Sessão do Mercado Livre não configurada (cookie meli_cookie ausente).');
    }

    return {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'origin': 'https://www.mercadolivre.com.br',
      'referer': 'https://www.mercadolivre.com.br/afiliados/dashboard',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'cookie': cookie
    };
  }

  /**
   * Consulta os dados oficiais da API interna de Afiliados do Mercado Livre
   */
  async fetchLiveMetrics(): Promise<MeliAffiliateOverview> {
    const headers = this.getHeaders();

    // 1. Métricas gerais (Cliques, Compradores, Ordens, Vendas, Comissões)
    const generalRes = await fetch(`${MELI_AFFILIATE_BASE}/dashboard/general?_t=${Date.now()}`, { headers });
    if (!generalRes.ok) {
      const err = await generalRes.text();
      throw new Error(`Falha ao obter dashboard/general (${generalRes.status}): ${err}`);
    }
    const generalData = (await generalRes.json()) as any;

    let totalClicks = 0;
    let totalBuyers = 0;
    let totalRequests = 0;
    let totalOrders = 0;
    let totalSales = 0;
    let totalCommissions = 0;

    if (Array.isArray(generalData.data)) {
      for (const item of generalData.data) {
        if (item.id === 'clicks') totalClicks = Number(item.current_amount) || 0;
        if (item.id === 'buyers') totalBuyers = Number(item.current_amount) || 0;
        if (item.id === 'requests') totalRequests = Number(item.current_amount) || 0;
        if (item.id === 'orders') totalOrders = Number(item.current_amount) || 0;
        if (item.id === 'sales') totalSales = Number(item.current_amount) || 0;
      }
    }

    if (Array.isArray(generalData.commissions)) {
      for (const item of generalData.commissions) {
        if (item.id === 'summary') totalCommissions = Number(item.current_amount) || 0;
      }
    }

    // 2. Ganho e CVR por Tag
    let cvr = 0;
    let tag = getConfig('meli_tag', 'caed1312314');
    try {
      const gananciasRes = await fetch(`${MELI_AFFILIATE_BASE}/dashboard/ganancias?_t=${Date.now()}`, { headers });
      if (gananciasRes.ok) {
        const gananciasData = (await gananciasRes.json()) as any;
        if (Array.isArray(gananciasData.item_list) && gananciasData.item_list.length > 0) {
          const first = gananciasData.item_list[0];
          tag = first.tag || tag;
          cvr = Number(first.cvr) || 0;
          if (!totalCommissions && first.earnings) {
            totalCommissions = Number(first.earnings);
          }
        }
      }
    } catch (err) {
      console.warn('[Meli Affiliate] Erro secundário em dashboard/ganancias:', err);
    }

    // 3. Vendas Recentes com detalhes do produto e comissões
    const recentSales: MeliAffiliateOverview['recentSales'] = [];
    try {
      const salesRes = await fetch(`${MELI_AFFILIATE_BASE}/dashboard/sales/general?_t=${Date.now()}&limit=20`, { headers });
      if (salesRes.ok) {
        const salesData = (await salesRes.json()) as any;
        if (Array.isArray(salesData.item_list)) {
          for (const s of salesData.item_list) {
            recentSales.push({
              id: String(s.id || ''),
              date: String(s.date || ''),
              productName: String(s.productName || 'Produto Pokémon TCG'),
              productImage: String(s.productImage || ''),
              link: String(s.link || ''),
              storeName: String(s.storeName || 'Mercado Livre'),
              saleValue: Number(s.saleValue) || 0,
              saleUnits: Number(s.saleUnits) || 1,
              commissionValue: Number(s.commissionValue) || 0,
              commissionPercentage: Number(s.commissionPercentage) || 0
            });
          }
        }
      }
    } catch (err) {
      console.warn('[Meli Affiliate] Erro secundário em dashboard/sales/general:', err);
    }

    // 4. Detalhe Diário de Desempenho
    const dailyData: MeliAffiliateOverview['dailyData'] = [];
    let commissionsToday = 0;
    let ordersToday = 0;

    const todayDateIso = new Date().toISOString().split('T')[0];
    const todayBrStr = new Date().toLocaleDateString('pt-BR'); // ex: 26/09/2026

    try {
      const dailyRes = await fetch(`${MELI_AFFILIATE_BASE}/dashboard/detalle-diario/general?_t=${Date.now()}`, { headers });
      if (dailyRes.ok) {
        const dData = (await dailyRes.json()) as any;
        if (Array.isArray(dData.item_list)) {
          for (const d of dData.item_list) {
            const dateStr = String(d.date || '');
            const orders = Number(d.orders) || 0;
            const quantity = Number(d.quantity) || 0;
            const earnings = Number(d.earnings) || 0;
            const touchpoints = Number(d.touchpoints) || 0;
            const itemCvr = Number(d.cvr) || 0;

            dailyData.push({
              date: dateStr,
              orders,
              quantity,
              earnings,
              touchpoints,
              cvr: itemCvr
            });

            if (dateStr === todayDateIso) {
              commissionsToday = earnings;
              ordersToday = orders;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Meli Affiliate] Erro secundário em dashboard/detalle-diario/general:', err);
    }

    // Fallback para vendas hoje a partir da lista recente se o detalhe diário estiver defasado
    if (commissionsToday === 0 && recentSales.length > 0) {
      const salesHoje = recentSales.filter(s => s.date === todayBrStr || s.date === todayDateIso);
      if (salesHoje.length > 0) {
        commissionsToday = salesHoje.reduce((acc, s) => acc + s.commissionValue, 0);
        ordersToday = salesHoje.length;
      }
    }

    const overview: MeliAffiliateOverview = {
      tag,
      totalClicks,
      totalBuyers,
      totalRequests,
      totalOrders,
      totalSales,
      totalCommissions,
      cvr,
      commissionsToday,
      ordersToday,
      recentSales,
      dailyData,
      updatedAt: new Date().toISOString()
    };

    // Salvar cache no banco SQLite
    this.saveToSqlite(overview);
    this.cache = overview;
    this.lastFetchTime = Date.now();

    return overview;
  }

  /**
   * Salva os dados no banco SQLite
   */
  private saveToSqlite(overview: MeliAffiliateOverview): void {
    try {
      const json = JSON.stringify(overview);
      db.prepare(`
        INSERT INTO meli_affiliate_cache (id, data_json, updated_at)
        VALUES (1, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          data_json = excluded.data_json,
          updated_at = CURRENT_TIMESTAMP
      `).run(json);
    } catch (err) {
      console.warn('[Meli Affiliate] Erro ao persistir cache SQLite:', err);
    }
  }

  /**
   * Recupera os dados do SQLite
   */
  loadFromSqlite(): MeliAffiliateOverview | null {
    try {
      const row = db.prepare('SELECT data_json, updated_at FROM meli_affiliate_cache WHERE id = 1').get() as { data_json: string; updated_at: string } | undefined;
      if (row?.data_json) {
        const parsed = JSON.parse(row.data_json) as MeliAffiliateOverview;
        parsed.updatedAt = row.updated_at || parsed.updatedAt;
        return parsed;
      }
    } catch (err) {
      console.warn('[Meli Affiliate] Erro ao ler cache SQLite:', err);
    }
    return null;
  }

  /**
   * Retorna os dados consolidados (com cache inteligente e atualização em background)
   */
  async getMetrics(forceRefresh = false): Promise<MeliAffiliateOverview> {
    const now = Date.now();
    if (!forceRefresh && this.cache && now - this.lastFetchTime < this.CACHE_TTL_MS) {
      return this.cache;
    }

    // Tentar carregar do SQLite primeiro
    const saved = this.loadFromSqlite();
    if (saved && !forceRefresh) {
      this.cache = saved;
      this.lastFetchTime = now;
      // Disparar atualização assíncrona em background se tiver mais de 10 minutos
      const age = now - new Date(saved.updatedAt).getTime();
      if (age > 10 * 60 * 1000) {
        this.fetchLiveMetrics().catch(err => {
          console.warn('[Meli Affiliate Background Refresh] Erro:', err.message);
        });
      }
      return saved;
    }

    // Buscar ao vivo se forçado ou inexistente
    return this.fetchLiveMetrics();
  }
}

export const meliAffiliateService = new MeliAffiliateService();
