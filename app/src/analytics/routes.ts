import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { meliService } from './meli.service.js';
import { meliAffiliateService } from './meli-affiliate.service.js';
import { metaAdsService } from './meta.service.js';
import { analyticsService } from './analytics.service.js';
import { getMetaInsightsStats, getMeliOrdersStats, getConfig, obterMetricasComunidade, getAllRotas, obterTotalMembrosComunidade, salvarTotalMembrosComunidade } from '../db/database.js';
import { getBrazilToday, getBrazilDaysAgo } from '../utils/date.js';
import { financasService } from './financas.service.js';
import { processarImportacaoAmazon, lancamentoRapidoAmazon, listarRelatoriosAmazon } from './amazon-financas.service.js';
import { whatsAppManager } from '../whatsapp/client.js';

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
          const hoje = getBrazilToday();
          const trintaDiasAtras = getBrazilDaysAgo(30);
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
        const hoje = getBrazilToday();
        const seteDiasAtras = getBrazilDaysAgo(7);

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

  // Consulta do Saldo de Caixa e Limites da Conta de Anúncios Meta Ads
  app.get(
    '/api/integrations/meta/balance',
    async (
      req: FastifyRequest<{
        Querystring: { accountId?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { accountId } = req.query || {};
        const balanceInfo = await metaAdsService.getAdAccountBalance(accountId);
        return {
          ok: true,
          data: balanceInfo
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ ok: false, error: msg });
      }
    }
  );

  // Auditoria Profunda de Campanhas e Anúncios de Hoje
  app.get(
    '/api/integrations/meta/audit',
    async (
      req: FastifyRequest<{
        Querystring: { date?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { date } = req.query || {};
        const audit = await metaAdsService.auditCampaignsDetailed(date);
        return {
          ok: true,
          data: audit
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ ok: false, error: msg });
      }
    }
  );

  // Histórico de alterações e tempo de veiculação da campanha ativa no Meta Ads
  app.get('/api/integrations/meta/campaign-history', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = await metaAdsService.getValidAccessToken();
      const campaignId = '52760556043290';
      
      const campRes = await fetch(`https://graph.facebook.com/v20.0/${campaignId}?fields=id,name,status,effective_status,created_time,updated_time,start_time,stop_time,daily_budget,lifetime_budget,budget_remaining,bid_strategy`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const campaign = await campRes.json() as any;

      const adsetsRes = await fetch(`https://graph.facebook.com/v20.0/${campaignId}/adsets?fields=id,name,status,effective_status,created_time,updated_time,start_time,end_time,daily_budget,targeting`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const adsets = await adsetsRes.json() as any;

      const adsRes = await fetch(`https://graph.facebook.com/v20.0/${campaignId}/ads?fields=id,name,status,effective_status,created_time,updated_time,creative{id,name,title,body}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const ads = await adsRes.json() as any;

      const insightsRes = await fetch(`https://graph.facebook.com/v20.0/${campaignId}/insights?time_increment=1&fields=spend,impressions,clicks,cpc,ctr,actions,date_start,date_stop&date_preset=maximum&limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const insights = await insightsRes.json() as any;

      const activitiesRes = await fetch(`https://graph.facebook.com/v20.0/${campaignId}/activities?fields=actor_name,event_type,event_time,extra_data&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const activities = await activitiesRes.json().catch(() => ({})) as any;

      return { ok: true, campaign, adsets, ads, insights, activities };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ ok: false, error: msg });
    }
  });

  // Atualização ou Recarga de Saldo de Caixa Meta Ads
  app.post(
    '/api/integrations/meta/balance',
    async (
      req: FastifyRequest<{
        Body: {
          saldo?: number;
          recarga?: number;
          descricao?: string;
          threshold?: number;
          mode?: 'hybrid' | 'auto' | 'manual';
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { saldo, recarga, descricao, threshold, mode } = req.body || {};
        const updated = await metaAdsService.updateAdAccountBalance({
          novoSaldo: saldo,
          recarga,
          descricao,
          alertThreshold: threshold,
          mode
        });
        return {
          ok: true,
          message: 'Saldo e preferências de caixa do Meta Ads atualizados com sucesso!',
          data: updated
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



  // Renovar Cookie de Afiliados do Mercado Livre (usado pelo CookieModal)
  app.post(
    '/api/afiliados/cookie',
    async (req: FastifyRequest<{ Body?: { cookie?: string } }>, reply: FastifyReply) => {
      try {
        const { cookie } = req.body || {};
        if (!cookie || cookie.trim().length < 10) {
          return reply.status(400).send({ ok: false, error: 'Cole o cookie da sessão do Mercado Livre para prosseguir.' });
        }
        meliAffiliateService.saveCookie(cookie.trim());
        const data = await meliAffiliateService.fetchLiveMetrics();
        return {
          ok: true,
          message: data.sessionExpired
            ? 'Cookie salvo, mas a sessão foi recusada ou expirou no Mercado Livre. Verifique o cookie.'
            : 'Cookie do Mercado Livre validado e sincronizado com sucesso!',
          sessionExpired: data.sessionExpired,
          data
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ ok: false, error: msg });
      }
    }
  );

  // Ajuste Manual / Snapshot do Dia (resiliência contra delays ou indisponibilidade da API do ML)
  app.post(
    '/api/dashboard/meli-affiliate/manual',
    async (
      req: FastifyRequest<{
        Body?: {
          commissionsToday: number;
          ordersToday: number;
          totalSalesToday?: number;
          clicksToday?: number;
          buyersToday?: number;
          productsEstimatedToday?: number;
          unrealizedSalesToday?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const body = req.body || { commissionsToday: 0, ordersToday: 0 };
        const data = meliAffiliateService.saveManualTodayMetrics({
          commissionsToday: Number(body.commissionsToday) || 0,
          ordersToday: Number(body.ordersToday) || 0,
          totalSalesToday: body.totalSalesToday !== undefined ? Number(body.totalSalesToday) : undefined,
          clicksToday: body.clicksToday !== undefined ? Number(body.clicksToday) : undefined,
          buyersToday: body.buyersToday !== undefined ? Number(body.buyersToday) : undefined,
          productsEstimatedToday: body.productsEstimatedToday !== undefined ? Number(body.productsEstimatedToday) : undefined,
          unrealizedSalesToday: body.unrealizedSalesToday !== undefined ? Number(body.unrealizedSalesToday) : undefined
        });
        return {
          ok: true,
          message: 'Métricas de hoje atualizadas com sucesso!',
          data
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ ok: false, error: msg });
      }
    }
  );

  // Reconciliação Automática Retroativa de Cancelamentos (Lookback Sync)
  app.post(
    '/api/dashboard/meli-affiliate/reconciliar',
    async (
      req: FastifyRequest<{
        Body?: { dias?: number };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const dias = Number(req.body?.dias) || 7;
        const resultado = await financasService.reconciliarCancelamentos(dias);
        return {
          ok: true,
          message: `Reconciliação dos últimos ${dias} dias concluída!`,
          ...resultado
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ ok: false, error: msg });
      }
    }
  );

  // ==========================================
  // 5. SINCRONIZAÇÃO UNIFICADA (META ADS + MELI AFILIADOS + MELI ORDENS + WHATSAPP MEMBROS)
  // ==========================================
  const sincronizarBaseMembrosWhatsApp = async (): Promise<{
    connected: boolean;
    totalMembros: number;
    grupoNome: string;
    totalGrupos: number;
  }> => {
    try {
      const state = whatsAppManager.getState();
      const connected = state.status === 'connected';

      if (!connected) {
        const salvo = obterTotalMembrosComunidade();
        return {
          connected: false,
          totalMembros: salvo.totalMembros,
          grupoNome: salvo.grupoNome,
          totalGrupos: 0
        };
      }

      const groups = await whatsAppManager.obterGruposComDetalhes();
      if (!groups || groups.length === 0) {
        const salvo = obterTotalMembrosComunidade();
        return {
          connected: true,
          totalMembros: salvo.totalMembros,
          grupoNome: salvo.grupoNome,
          totalGrupos: 0
        };
      }

      // Identificar grupo VIP de destino prioritário
      const rotas = getAllRotas().filter((r) => r.ativa);
      const destinosRotas = new Set(rotas.flatMap((r) => r.destinos));

      // 1. Prioridade: grupo cadastrado como destino de rota ativa
      let targetGroup = groups.find((g) => destinosRotas.has(g.id));

      // 2. Prioridade: grupo com maior número de membros que tenha nome relevante
      if (!targetGroup) {
        targetGroup = groups.find((g) => /pokemon|tcg|vip|promo|copag/i.test(g.nome));
      }

      // 3. Fallback: grupo com maior total de membros
      if (!targetGroup) {
        targetGroup = groups[0];
      }

      if (targetGroup && targetGroup.total_membros > 0) {
        salvarTotalMembrosComunidade(targetGroup.total_membros, targetGroup.nome);
        return {
          connected: true,
          totalMembros: targetGroup.total_membros,
          grupoNome: targetGroup.nome,
          totalGrupos: groups.length
        };
      }

      const salvo = obterTotalMembrosComunidade();
      return {
        connected: true,
        totalMembros: salvo.totalMembros,
        grupoNome: salvo.grupoNome,
        totalGrupos: groups.length
      };
    } catch (err) {
      console.warn('[WhatsApp Sync] Erro ao sincronizar membros de grupos:', err);
      const salvo = obterTotalMembrosComunidade();
      return {
        connected: false,
        totalMembros: salvo.totalMembros,
        grupoNome: salvo.grupoNome,
        totalGrupos: 0
      };
    }
  };

  const handleSyncAll = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const hoje = getBrazilToday();
      const trintaDiasAtras = getBrazilDaysAgo(30);

      // Disparar sincronização 360° em paralelo (Meta Ads + Mercado Livre + WhatsApp Membros)
      const [metaResult, affiliateResult, meliResult, balanceResult, whatsappResult] = await Promise.allSettled([
        metaAdsService.syncMetaInsights(trintaDiasAtras, hoje),
        meliAffiliateService.fetchLiveMetrics(),
        meliService.getValidAccessToken().then(() => {
          const dateTo = new Date();
          const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return meliService.syncMeliOrders(dateFrom, dateTo);
        }).catch(() => null),
        metaAdsService.getAdAccountBalance().catch(() => null),
        sincronizarBaseMembrosWhatsApp()
      ]);

      await analyticsService.consolidateRange(trintaDiasAtras, hoje).catch(() => null);
      await financasService.sincronizarDiaHojeComAfiliados().catch(() => null);

      return {
        ok: true,
        message: 'Sincronização unificada realizada com sucesso!',
        meta: metaResult.status === 'fulfilled' ? metaResult.value : { error: String(metaResult.reason) },
        affiliate: affiliateResult.status === 'fulfilled' ? affiliateResult.value : { error: String(affiliateResult.reason) },
        meliOrders: meliResult.status === 'fulfilled' ? meliResult.value : null,
        balance: balanceResult.status === 'fulfilled' ? balanceResult.value : null,
        whatsapp: whatsappResult.status === 'fulfilled' ? whatsappResult.value : null,
        timestamp: new Date().toISOString()
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ ok: false, error: msg });
    }
  };

  app.post('/api/integrations/sync-all', handleSyncAll);
  app.get('/api/integrations/sync-all', handleSyncAll);

  // Rotas Dedicadas para Sincronização de Membros do WhatsApp
  const handleSyncMembers = async () => {
    const res = await sincronizarBaseMembrosWhatsApp();
    return { ok: true, ...res };
  };
  app.post('/api/whatsapp/sync-members', handleSyncMembers);
  app.get('/api/whatsapp/sync-members', handleSyncMembers);

  app.get('/api/whatsapp/members-count', async () => {
    const dados = obterTotalMembrosComunidade();
    return { ok: true, ...dados };
  });

  // ==========================================
  // 6. ROTAS DE FINANÇAS & DRE AUTOMÁTICO (META ADS + MERCADO LIVRE)
  // ==========================================

  // Meses disponíveis
  const handleGetMeses = async () => {
    const meses = financasService.getMesesDisponiveis();
    return { ok: true, meses };
  };
  app.get('/api/financas/meses', handleGetMeses);
  app.get('/api/bot/financas/meses', handleGetMeses);

  // Balanço Mensal / DRE Consolidado
  const handleGetBalanco = async (req: FastifyRequest<{ Querystring: { mes?: string } }>, reply: FastifyReply) => {
    try {
      const mes = req.query?.mes;
      const hojeMes = getBrazilToday().slice(0, 7);
      if (!mes || mes === hojeMes) {
        await financasService.sincronizarDiaHojeComAfiliados().catch(() => null);
      }
      const balanco = await financasService.getBalancoMensal(mes);
      return { ok: true, balanco };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ ok: false, error: msg });
    }
  };
  app.get('/api/financas/balanco', handleGetBalanco);
  app.get('/api/bot/financas/balanco', handleGetBalanco);

  // Relatório Mensal Executivo Arquivado (Meta Ads + Mercado Livre Afiliados)
  app.get(
    '/api/financas/relatorio-mensal',
    async (req: FastifyRequest<{ Querystring: { mes?: string } }>, reply: FastifyReply) => {
      try {
        const hojeStr = getBrazilToday();
        const mesAtualStr = hojeStr.slice(0, 7);
        const mes = req.query?.mes && /^\d{4}-\d{2}$/.test(req.query.mes) ? req.query.mes : mesAtualStr;

        const balanco = await financasService.getBalancoMensal(mes);
        const metaStats = getMetaInsightsStats(`${mes}-01`, `${mes}-31`);

        const [anoStr, mesNumStr] = mes.split('-');
        const ano = parseInt(anoStr, 10);
        const mesNum = parseInt(mesNumStr, 10);
        const totalDiasNoMes = new Date(ano, mesNum, 0).getDate();

        const ehMesAtual = mes === mesAtualStr;
        const diaAtualNum = parseInt(hojeStr.slice(8, 10), 10);
        const diasDecorridos = ehMesAtual ? Math.min(diaAtualNum, totalDiasNoMes) : totalDiasNoMes;
        const statusCompetencia: 'em_andamento' | 'fechado' = ehMesAtual ? 'em_andamento' : 'fechado';

        // Estatísticas dos dias registrados
        const diasComMovimento = balanco.itens.length;
        const diasLucrativos = balanco.itens.filter((i) => i.saldoDia > 0).length;
        const diasPrejuizo = balanco.itens.filter((i) => i.saldoDia < 0).length;
        const mediaDiariaFaturamento = diasDecorridos > 0 ? Number((balanco.totalVendasBrutas / diasDecorridos).toFixed(2)) : 0;
        const mediaDiariaGasto = diasDecorridos > 0 ? Number((balanco.totalGastoCampanhas / diasDecorridos).toFixed(2)) : 0;
        const mediaDiariaLucro = diasDecorridos > 0 ? Number((balanco.resultadoLiquido / diasDecorridos).toFixed(2)) : 0;

        // Diagnóstico Gerencial Automatizado
        let statusRoas = 'Neutro';
        let recomendacaoRoas = 'Manter monitoramento de métricas diárias.';
        if (balanco.blendedRoas >= 4.0) {
          statusRoas = 'Excelente (Escala Altamente Recomendada)';
          recomendacaoRoas = 'Retorno sobre investimento muito alto. Aumentar orçamento de tráfego gradualmente para acelerar captação de leads.';
        } else if (balanco.blendedRoas >= 2.0) {
          statusRoas = 'Saudável (Retorno Positivo)';
          recomendacaoRoas = 'Operação em faixa lucrativa sólida. Preservar regra dos 70/30 para retroalimentar campanhas.';
        } else if (balanco.blendedRoas > 0) {
          statusRoas = 'Atenção (Próximo ao Break-Even)';
          recomendacaoRoas = 'ROAS abaixo de 2.0x. Otimizar criativos, palavras-chave e ofertas enviadas para elevar taxa de conversão.';
        } else if (balanco.totalGastoCampanhas > 0 && balanco.totalVendasBrutas === 0) {
          statusRoas = 'Alerta de Gasto sem Vendas';
          recomendacaoRoas = 'Houve gasto em tráfego sem faturamento registrado no período. Avaliar links de afiliado e apuração de conversões.';
        } else {
          statusRoas = 'Competência Recém-Iniciada / Sem Dados';
          recomendacaoRoas = 'Inicie o lançamento das campanhas e aguarde as primeiras conversões do período.';
        }

        const formatarBRL = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Gerar resumo pré-formatado para WhatsApp
        const nomeMeses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const rotuloMes = `${nomeMeses[mesNum] || mes} de ${ano}`;
        const linkVitrineCurto = getConfig('link_vitrine_curto', 'https://mercadolivre.com/sec/2rM6RPm');

        const resumoWhatsapp = [
          `📊 *RELATÓRIO FINANCEIRO EXECUTIVO · ${rotuloMes.toUpperCase()}*`,
          `🏛️ *Promo Pokémon TCG · Auditoria Meta Ads & Mercado Livre*`,
          `📅 *Status:* ${statusCompetencia === 'em_andamento' ? `Em Andamento (${diasDecorridos}/${totalDiasNoMes} dias decorridos)` : 'Competência Fechada & Consolidada'}`,
          ``,
          `💰 *RESUMO OPERACIONAL:*`,
          `• *Faturamento Meli:* R$ ${formatarBRL(balanco.totalVendasBrutas)}`,
          `• *Comissões Confirmadas:* R$ ${formatarBRL(balanco.totalLucroBruto)}`,
          `• *Investimento Meta Ads:* R$ ${formatarBRL(balanco.totalGastoCampanhas)}`,
          `• *Lucro Operacional Líquido:* R$ ${formatarBRL(balanco.resultadoLiquido)}`,
          `• *Blended ROAS:* ${balanco.blendedRoas.toFixed(2)}x`,
          `• *Margem Líquida:* ${balanco.margemPercentual.toFixed(1)}%`,
          ``,
          `⚖️ *DISTRIBUIÇÃO DA REGRA 70/30:*`,
          `• 🔄 *Reinvestimento Tráfego (70%):* R$ ${formatarBRL(balanco.valorReinvestimentoCampanhas)}`,
          `• 💵 *Lucro Livre p/ Retirada (30%):* R$ ${formatarBRL(balanco.valorLucroDisponivel)}`,
          ``,
          `🎯 *TRÁFEGO & EFICIÊNCIA (META ADS):*`,
          `• *Cliques no Período:* ${metaStats.totalClicks.toLocaleString('pt-BR')}`,
          `• *Impressões:* ${metaStats.totalImpressions.toLocaleString('pt-BR')}`,
          `• *CPC Médio:* R$ ${formatarBRL(metaStats.avgCpc)}`,
          `• *CTR Médio:* ${metaStats.avgCtr.toFixed(2)}%`,
          ``,
          `📌 *Parecer:* ${statusRoas}`,
          `💡 *Recomendação:* ${recomendacaoRoas}`,
          ``,
          `🛒 *Canal / Vitrine Oficial Mercado Livre:* ${linkVitrineCurto}`,
          ``,
          `_Emitido automaticamente via Super Cockpit Promo TCG em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}_`
        ].join('\n');

        return {
          ok: true,
          mesReferencia: mes,
          rotuloMes,
          statusCompetencia,
          diasNoMes: totalDiasNoMes,
          diasDecorridos,
          percentualMesDecorrido: Number(((diasDecorridos / totalDiasNoMes) * 100).toFixed(1)),
          geradoEm: new Date().toISOString(),
          kpis: {
            faturamentoMeli: balanco.totalVendasBrutas,
            comissoesConfirmadasMeli: balanco.totalLucroBruto,
            investimentoMetaAds: balanco.totalGastoCampanhas,
            lucroOperacionalLiquido: balanco.resultadoLiquido,
            reservaReinvestimento70: balanco.valorReinvestimentoCampanhas,
            lucroDisponivel30: balanco.valorLucroDisponivel,
            blendedRoas: balanco.blendedRoas,
            margemLucroPercentual: balanco.margemPercentual,
            cliquesMeta: metaStats.totalClicks,
            impressoesMeta: metaStats.totalImpressions,
            cpcMedio: metaStats.avgCpc,
            ctrMedio: metaStats.avgCtr,
            diasComMovimento,
            diasLucrativos,
            diasPrejuizo,
            mediaDiariaFaturamento,
            mediaDiariaGasto,
            mediaDiariaLucro
          },
          diagnostico: {
            statusRoas,
            recomendacaoRoas
          },
          resumoWhatsapp,
          detalhamentoDiario: balanco.itens
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ ok: false, error: msg });
      }
    }
  );

  // Exportar Balanço em CSV
  const handleExportCsv = async (req: FastifyRequest<{ Querystring: { mes?: string } }>, reply: FastifyReply) => {
    try {
      const mes = req.query?.mes || getBrazilToday().slice(0, 7);
      const balanco = await financasService.getBalancoMensal(mes);

      let csv = 'Data;Gasto Campanhas Meta (R$);Faturamento Enviado Meli (R$);Comissões Confirmadas (R$);Saldo Líquido (R$);Blended ROAS;Cliques Meta;Impressões Meta\n';
      for (const item of balanco.itens) {
        csv += `${item.dataLancamento};${item.gastoCampanhas.toFixed(2)};${item.vendasBrutas.toFixed(2)};${item.lucroBruto.toFixed(2)};${item.saldoDia.toFixed(2)};${item.blendedRoas.toFixed(2)};${item.cliquesMeta};${item.impressoesMeta}\n`;
      }

      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="relatorio-financas-${mes}.csv"`);
      return reply.send(csv);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ ok: false, error: msg });
    }
  };
  app.get('/api/financas/exportar-csv', handleExportCsv);
  app.get('/api/bot/financas/exportar-csv', handleExportCsv);

  // Comprovantes / Despesas PDF
  const handleGetDespesas = async (req: FastifyRequest<{ Querystring: { inicio?: string; fim?: string } }>) => {
    const { inicio, fim } = req.query || {};
    const resumo = financasService.listarFaturasPdf(inicio, fim);
    return { ok: true, resumo };
  };
  app.get('/api/financas/despesas', handleGetDespesas);
  app.get('/api/bot/financas/despesas', handleGetDespesas);

  const handleDeleteDespesa = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(req.params.id, 10);
    const ok = financasService.excluirFaturaPdf(id);
    return { ok, message: ok ? 'Comprovante removido' : 'Não encontrado' };
  };
  app.delete('/api/financas/despesas/:id', handleDeleteDespesa);
  app.delete('/api/bot/financas/despesas/:id', handleDeleteDespesa);

  // Lançamentos Financeiros Diários (Adicionar / Ajustar / Excluir)
  const handleSaveLancamento = async (
    req: FastifyRequest<{
      Body: {
        dataLancamento: string;
        lucroBruto?: number;
        gastoCampanhas?: number;
        vendasBrutas?: number;
        descricao?: string;
        categoria?: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { dataLancamento, lucroBruto, gastoCampanhas, vendasBrutas, descricao, categoria } = req.body || {};
      if (!dataLancamento) {
        return reply.status(400).send({ ok: false, error: 'Data do lançamento é obrigatória (formato YYYY-MM-DD).' });
      }
      const result = financasService.salvarLancamentoDiario({
        dataLancamento,
        lucroBruto: Number(lucroBruto) || 0,
        gastoCampanhas: Number(gastoCampanhas) || 0,
        vendasBrutas: Number(vendasBrutas) || (Number(lucroBruto) ? Number(lucroBruto) * 10 : 0),
        descricao,
        categoria,
        origem: 'manual'
      });
      return { ok: true, result, message: 'Lançamento diário registrado com sucesso.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ ok: false, error: msg });
    }
  };
  app.post('/api/financas/lancamentos', handleSaveLancamento);
  app.post('/api/bot/financas/lancamentos', handleSaveLancamento);

  const handleDeleteLancamento = async (
    req: FastifyRequest<{ Params: { data: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const data = req.params.data;
      const ok = financasService.excluirLancamentoDiario(data);
      return { ok, message: ok ? 'Lançamento diário removido com sucesso' : 'Lançamento não encontrado' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ ok: false, error: msg });
    }
  };
  app.delete('/api/financas/lancamentos/:data', handleDeleteLancamento);
  app.delete('/api/bot/financas/lancamentos/:data', handleDeleteLancamento);

  // Registro de Fatura / Comprovante (com suporte a fallback de lançamento)
  const handleSaveDespesa = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body || {}) as Record<string, any>;
    if (body.dataLancamento) {
      const { dataLancamento, lucroBruto, gastoCampanhas, vendasBrutas, descricao, categoria } = body;
      const result = financasService.salvarLancamentoDiario({
        dataLancamento,
        lucroBruto: Number(lucroBruto) || 0,
        gastoCampanhas: Number(gastoCampanhas) || 0,
        vendasBrutas: Number(vendasBrutas) || (Number(lucroBruto) ? Number(lucroBruto) * 10 : 0),
        descricao,
        categoria,
        origem: 'manual'
      });
      return { ok: true, id: 1, result, message: 'Lançamento diário registrado com sucesso' };
    }
    const id = financasService.salvarFaturaPdf({
      dataDespesa: body.dataDespesa || body.data,
      valor: Number(body.valor) || 0,
      descricao: body.descricao,
      nomeArquivo: body.nomeArquivo || 'comprovante.pdf',
      tamanhoBytes: body.tamanhoBytes
    });
    return { ok: true, id, message: 'Comprovante registrado com sucesso' };
  };
  app.post('/api/financas/despesas', handleSaveDespesa);
  app.post('/api/bot/financas/despesas', handleSaveDespesa);

  // ==========================================
  // ROTAS DE FINANÇAS - AMAZON ASSOCIATES
  // ==========================================

  // 1. Importação de Relatório CSV / TSV da Amazon Associates
  const handleImportAmazonRelatorio = async (
    req: FastifyRequest<{
      Body: {
        nomeArquivo?: string;
        conteudo?: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const nomeArquivo = req.body?.nomeArquivo || 'relatorio_amazon.csv';
      const conteudo = req.body?.conteudo || '';

      if (!conteudo || conteudo.trim().length === 0) {
        return reply.status(400).send({ ok: false, error: 'Conteúdo do relatório CSV da Amazon está vazio.' });
      }

      const resultado = processarImportacaoAmazon(nomeArquivo, conteudo);
      if (!resultado.ok) {
        return reply.status(422).send({
          ok: false,
          error: 'Não foi possível extrair dados válidos do arquivo. Verifique se o relatório contém colunas de Data, Comissões e Vendas.'
        });
      }

      return {
        ok: true,
        message: `Relatório importado com sucesso! ${resultado.diasAfetados} dias consolidados no DRE.`,
        dados: resultado
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ ok: false, error: msg });
    }
  };
  app.post('/api/financas/amazon/importar-relatorio', handleImportAmazonRelatorio);
  app.post('/api/bot/financas/amazon/importar-relatorio', handleImportAmazonRelatorio);

  // 2. Lançamento rápido de comissões diárias da Amazon
  const handleLancamentoRapidoAmazon = async (
    req: FastifyRequest<{
      Body: {
        data: string;
        comissao: number;
        vendas?: number;
        itens?: number;
        descricao?: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { data, comissao, vendas, itens, descricao } = req.body || {};
      if (!data || comissao === undefined) {
        return reply.status(400).send({ ok: false, error: 'Data e valor da Comissão são obrigatórios.' });
      }

      const sucesso = lancamentoRapidoAmazon({
        data,
        comissao: Number(comissao),
        vendas: vendas !== undefined ? Number(vendas) : undefined,
        itens: itens !== undefined ? Number(itens) : undefined,
        descricao
      });

      return {
        ok: sucesso,
        message: sucesso ? 'Lançamento da Amazon salvo com sucesso no DRE!' : 'Erro ao persistir lançamento.'
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ ok: false, error: msg });
    }
  };
  app.post('/api/financas/amazon/lancamento-rapido', handleLancamentoRapidoAmazon);
  app.post('/api/bot/financas/amazon/lancamento-rapido', handleLancamentoRapidoAmazon);

  // 3. Listagem de relatórios importados da Amazon
  const handleListarRelatoriosAmazon = async () => {
    const relatorios = listarRelatoriosAmazon();
    return { ok: true, relatorios };
  };
  app.get('/api/financas/amazon/relatorios', handleListarRelatoriosAmazon);
  app.get('/api/bot/financas/amazon/relatorios', handleListarRelatoriosAmazon);

  // ==========================================
  // 4. MÉTRICAS DE COMUNIDADE (WHATSAPP AO VIVO)
  // ==========================================
  const handleMetricasComunidade = async (
    req: FastifyRequest<{
      Querystring: { chatId?: string };
    }>
  ) => {
    const { chatId } = req.query || {};
    const metricas = obterMetricasComunidade(chatId);
    return { ok: true, data: metricas };
  };
  app.get('/api/comunidade/metricas', handleMetricasComunidade);
  app.get('/api/bot/comunidade/metricas', handleMetricasComunidade);
}
