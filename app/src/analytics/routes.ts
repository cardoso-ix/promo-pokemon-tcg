import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { meliService } from './meli.service.js';
import { meliAffiliateService } from './meli-affiliate.service.js';
import { metaAdsService } from './meta.service.js';
import { analyticsService } from './analytics.service.js';
import { getMetaInsightsStats, getMeliOrdersStats } from '../db/database.js';

export async function registerAnalyticsRoutes(app: FastifyInstance) {
  // ==========================================
  // 1. ROTAS DO META ADS
  // ==========================================

  app.get('/api/integrations/meta/config', async () => {
    const status = await metaAdsService.getConfigStatus();
    return { ok: true, ...status };
  });

  app.post(
    '/api/integrations/meta/config',
    async (
      req: FastifyRequest<{
        Body: { accessToken: string; accountId: string; syncNow?: boolean };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { accessToken, accountId, syncNow } = req.body || {};
        if (!accessToken && !accountId) {
          return reply.status(400).send({ ok: false, error: 'Informe ao menos o Token de Acesso ou o ID da Conta de Anúncios.' });
        }

        await metaAdsService.saveConfig(accessToken || '', accountId || '');

        let syncResult = null;
        if (syncNow) {
          const hoje = new Date().toISOString().split('T')[0];
          const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          syncResult = await metaAdsService.syncMetaInsights(trintaDiasAtras, hoje, accountId);
          await analyticsService.consolidateRange(trintaDiasAtras, hoje);
        }

        return {
          ok: true,
          message: 'Configurações do Meta Ads salvas com sucesso!',
          sync: syncResult
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ ok: false, error: msg });
      }
    }
  );

  app.get(
    '/api/dashboard/meta-insights',
    async (
      req: FastifyRequest<{
        Querystring: { startDate?: string; endDate?: string };
      }>
    ) => {
      const { startDate, endDate } = req.query || {};
      const stats = getMetaInsightsStats(startDate, endDate);
      const config = await metaAdsService.getConfigStatus();
      return {
        ok: true,
        configured: config.configured,
        accountId: config.accountId,
        data: stats
      };
    }
  );

  app.post(
    '/api/integrations/meta/sync',
    async (
      req: FastifyRequest<{
        Body: { since?: string; until?: string; accountId?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const hoje = new Date().toISOString().split('T')[0];
        const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const since = req.body?.since || seteDiasAtras;
        const until = req.body?.until || hoje;
        const accountId = req.body?.accountId;

        const result = await metaAdsService.syncMetaInsights(since, until, accountId);
        await analyticsService.consolidateRange(since, until);

        return {
          ok: true,
          ...result
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ ok: false, error: msg });
      }
    }
  );

  // ==========================================
  // 2. ROTAS DO MERCADO LIVRE (TEMPO REAL & DRE)
  // ==========================================

  // Métricas Consolidadas do Mercado Livre para o Dashboard
  app.get(
    '/api/dashboard/meli-insights',
    async (
      req: FastifyRequest<{
        Querystring: { startDate?: string; endDate?: string };
      }>
    ) => {
      const { startDate, endDate } = req.query || {};
      const stats = getMeliOrdersStats(startDate, endDate);
      const host = `${req.protocol}://${req.hostname}`;
      const config = await meliService.getConfigStatus(host);

      return {
        ok: true,
        configured: config.configured,
        userId: config.userId,
        webhookUrl: config.webhookUrl,
        data: stats
      };
    }
  );

  // Status e URLs de Configuração do Mercado Livre
  app.get('/api/integrations/meli/config', async (req: FastifyRequest) => {
    const host = `${req.protocol}://${req.hostname}`;
    const status = await meliService.getConfigStatus(host);
    return { ok: true, ...status };
  });

  // Diagnóstico Detalhado da API do Mercado Livre
  app.get('/api/integrations/meli/diagnostico', async (req: FastifyRequest) => {
    try {
      const accessToken = await meliService.getValidAccessToken();
      const meRes = await fetch('https://api.mercadolibre.com/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const meData = await meRes.json() as any;

      const sellerRes = await fetch(`https://api.mercadolibre.com/orders/search?seller=${meData.id}&sort=date_desc&limit=10`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const sellerData = await sellerRes.json() as any;

      return {
        ok: true,
        user: { id: meData.id, nickname: meData.nickname, site_id: meData.site_id },
        totalOrders: sellerData.paging?.total ?? 0,
        recentOrders: sellerData.results?.slice(0, 5)?.map((o: any) => ({
          id: o.id,
          date_created: o.date_created,
          total_amount: o.total_amount,
          status: o.status
        }))
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg };
    }
  });

  // Salvar Credenciais do Mercado Livre
  app.post(
    '/api/integrations/meli/config',
    async (
      req: FastifyRequest<{
        Body: {
          clientId?: string;
          clientSecret?: string;
          accessToken?: string;
          refreshToken?: string;
          userId?: number;
          syncNow?: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const body = req.body || {};
        await meliService.saveConfig(body);

        let syncResult = null;
        if (body.syncNow && body.accessToken) {
          const dateTo = new Date();
          const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          syncResult = await meliService.syncMeliOrders(dateFrom, dateTo);
        }

        return {
          ok: true,
          message: 'Configurações do Mercado Livre salvas com sucesso!',
          sync: syncResult
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ ok: false, error: msg });
      }
    }
  );

  // Gerar URL de Autorização OAuth
  app.get('/api/integrations/meli/auth-url', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const redirectUri = 'https://108-174-145-77.sslip.io/api/integrations/meli/callback';
      const authUrl = meliService.getAuthUrl(redirectUri);
      return { ok: true, authUrl };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ ok: false, error: msg });
    }
  });

  // Iniciar fluxo OAuth 2.0 (Redirecionamento direto)
  app.get('/api/integrations/meli/auth', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const redirectUri = 'https://108-174-145-77.sslip.io/api/integrations/meli/callback';
      const authUrl = meliService.getAuthUrl(redirectUri);
      return reply.redirect(authUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ ok: false, error: msg });
    }
  });

  // Callback OAuth 2.0 do Mercado Livre
  app.get('/api/integrations/meli/callback', async (req: FastifyRequest, reply: FastifyReply) => {
    const { code, error } = req.query as { code?: string; error?: string };

    if (error) {
      return reply.redirect(`http://108.174.145.77:3000/?meli=error&error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return reply.redirect('http://108.174.145.77:3000/?meli=missing_code');
    }

    try {
      const redirectUri = 'https://108-174-145-77.sslip.io/api/integrations/meli/callback';
      await meliService.exchangeCodeForToken(code, redirectUri);

      // Sincronizar pedidos dos últimos 30 dias automaticamente
      const dateTo = new Date();
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      meliService.syncMeliOrders(dateFrom, dateTo).catch(err => {
        console.warn('[Meli Sync Background] Falha na sincronização pós-oauth:', err);
      });

      return reply.redirect('http://108.174.145.77:3000/?meli=connected');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.redirect(`http://108.174.145.77:3000/?meli=error&error=${encodeURIComponent(msg)}`);
    }
  });

  // Handler reutilizável de Webhooks Push em Tempo Real do Mercado Livre
  const handleMeliWebhook = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body || {}) as { topic?: string; resource?: string; user_id?: number };

    // Resposta imediata 200 OK exigida pelo Mercado Livre para evitar timeout
    reply.status(200).send({ received: true });

    // Processamento push em tempo real (latência < 1s)
    meliService.handleWebhook(body).catch((err: unknown) => {
      console.error('[Meli Webhook Error] Falha ao processar evento push:', err);
    });
  };

  // Suporte a ambos os endpoints de Webhook
  app.post('/api/webhooks/meli', handleMeliWebhook);
  app.post('/api/webhooks/mercadolivre', handleMeliWebhook);

  // Sincronização manual sob demanda de pedidos
  app.post(
    '/api/integrations/meli/sync',
    async (
      req: FastifyRequest<{
        Body: { days?: number; startDate?: string; endDate?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { days, startDate, endDate } = req.body || {};
        let dateFrom: Date;
        let dateTo = new Date();

        if (startDate && endDate) {
          dateFrom = new Date(startDate);
          dateTo = new Date(endDate);
        } else {
          const numDays = days || 30;
          dateFrom = new Date(Date.now() - numDays * 24 * 60 * 60 * 1000);
        }

        const result = await meliService.syncMeliOrders(dateFrom, dateTo);

        // Atualizar sumários de analytics
        const startStr = dateFrom.toISOString().split('T')[0];
        const endStr = dateTo.toISOString().split('T')[0];
        await analyticsService.consolidateRange(startStr, endStr);

        return {
          ok: true,
          periodo: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
          ...result
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ ok: false, error: msg });
      }
    }
  );

  // ==========================================
  // 3. OVERVIEW CONSOLIDADO DE ANALYTICS
  // ==========================================
  app.get(
    '/api/dashboard/overview',
    async (
      req: FastifyRequest<{
        Querystring: { startDate?: string; endDate?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { startDate, endDate } = req.query || {};
        const overview = await analyticsService.getDashboardOverview(startDate, endDate);
        return {
          ok: true,
          data: overview
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ ok: false, error: msg });
      }
    }
  );

  // ==========================================
  // 4. MERCADO LIVRE AFILIADOS (OFICIAL & AUTOMÁTICO)
  // ==========================================
  app.get('/api/dashboard/meli-affiliate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refresh } = (req.query as { refresh?: string }) || {};
      const connected = meliAffiliateService.isConnected();
      const data = await meliAffiliateService.getMetrics(refresh === 'true');
      return { ok: true, connected, data };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ ok: false, error: msg });
    }
  });

  app.post(
    '/api/integrations/meli-affiliate/sync',
    async (req: FastifyRequest<{ Body?: { cookie?: string } }>, reply: FastifyReply) => {
      try {
        const { cookie } = req.body || {};
        if (cookie && cookie.trim().length > 10) {
          meliAffiliateService.saveCookie(cookie.trim());
        }
        const data = await meliAffiliateService.fetchLiveMetrics();
        return {
          ok: true,
          connected: true,
          message: 'Comissões de Afiliado sincronizadas com sucesso!',
          data
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ ok: false, error: msg });
      }
    }
  );
}
