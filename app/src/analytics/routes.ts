import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { meliService } from './meli.service.js';
import { metaAdsService } from './meta.service.js';
import { analyticsService } from './analytics.service.js';

export async function registerAnalyticsRoutes(app: FastifyInstance) {
  // 1. Rota para iniciar o fluxo OAuth 2.0 do Mercado Livre
  app.get('/api/integrations/meli/auth', async (req: FastifyRequest, reply: FastifyReply) => {
    const appId = process.env.MELI_APP_ID || process.env.MELI_CLIENT_ID || '';
    const redirectUri = process.env.MELI_REDIRECT_URI || 'http://localhost:3000/api/integrations/meli/callback';

    if (!appId) {
      return reply.status(400).send({
        ok: false,
        error: 'MELI_APP_ID não configurado no .env'
      });
    }

    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    return reply.redirect(authUrl);
  });

  // 2. Callback OAuth 2.0 do Mercado Livre
  app.get('/api/integrations/meli/callback', async (req: FastifyRequest, reply: FastifyReply) => {
    const { code, error } = req.query as { code?: string; error?: string };

    if (error) {
      return reply.status(400).send({
        ok: false,
        error: `Autorização recusada pelo Mercado Livre: ${error}`
      });
    }

    if (!code) {
      return reply.status(400).send({
        ok: false,
        error: 'Parâmetro "code" ausente no callback.'
      });
    }

    try {
      const tokens = await meliService.exchangeCodeForToken(code);
      return reply.send({
        ok: true,
        message: 'Autenticação com o Mercado Livre concluída com sucesso!',
        userId: tokens.user_id,
        expiresIn: tokens.expires_in
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ ok: false, error: msg });
    }
  });

  // 3. Webhook oficial do Mercado Livre (tópico orders_v2)
  app.post('/api/webhooks/meli', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body || {}) as { topic?: string; resource?: string; user_id?: number };

    // Resposta imediata 200 OK para evitar timeout e retransmissões do Meli
    reply.status(200).send({ received: true });

    // Processamento assíncrono em background
    meliService.handleWebhook(body).catch((err: unknown) => {
      console.error('[Meli Webhook Error] Falha ao processar evento:', err);
    });
  });

  // 4. Sincronização manual ou agendada de pedidos do Mercado Livre
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
          const numDays = days || 7;
          dateFrom = new Date(Date.now() - numDays * 24 * 60 * 60 * 1000);
        }

        const result = await meliService.syncMeliOrders(dateFrom, dateTo);

        // Consolida os sumários dos dias afetados
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

  // 5. Sincronização manual ou agendada de Insights do Meta Ads
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

        // Consolida os sumários dos dias afetados
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

  // 6. Endpoint de Overview do Dashboard com métricas consolidadas
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
}
