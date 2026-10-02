import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';
import {
  getConfig,
  setConfig,
  getAllConfigs,
  getAllRotas,
  saveRota,
  toggleRota,
  deleteRota,
  getRecentLogs,
  getCachedChats,
  getPostsLastHour,
  getFluxoHorarioHoje,
  insertLog,
  DEFAULT_MSG_ABERTURA,
  getHistoricoProdutosConsolidado,
  getExtratoProdutoValores,
  buscarBenchmarkPreco,
  migrarLogsParaHistoricoProdutos,
  getTotalEnviadosHoje,
  PRESET_MSGS_ABERTURA
} from '../db/database.js';
import {
  dispararMensagemAbertura,
  obterHoraBrasilia,
  obterDestinosAtivos,
  prepararTextoMensagemAbertura
} from '../core/agendador.js';
import { whatsAppManager, WhatsAppState } from '../whatsapp/client.js';
import {
  shortenToMeli,
  processMessageText,
  downloadProductImage,
  fetchSocialShortLink
} from '../core/affiliate.js';
import {
  extrairDadosAnuncio,
  isProdutoTCG,
  detectarGatilhoUrgencia,
  detectarMensagemCupom,
  formatarMensagemReplicada,
  extrairCupom,
  extrairParcelamento,
  extrairPrecoUnitario,
  determinarTipoMensagem,
  obterFotoCupomBuffer,
  FOTO_CUPOM_OFICIAL_URL
} from '../core/anuncio.js';
import {
  extrairDadosOferta,
  registrarOfertaPlanilha,
  APPS_SCRIPT_TEMPLATE
} from '../core/sheets.js';
import { redigirOfertaComIA } from '../core/deepseek.js';
import {
  verifyCredentials,
  createSessionToken,
  verifySessionToken,
  extractSessionToken,
  buildSessionCookie,
  buildClearCookie
} from './auth.js';
import { setupAnalyticsModule } from '../analytics/index.js';
import { meliService } from '../analytics/meli.service.js';
import {
  buscarNoRadar,
  formatarCopyCliente,
  formatarCopyGrupo,
  registrarCotacaoManualRadar,
  excluirItemRadar,
  type FiltrosRadar,
  type ResultadoRadarItem
} from '../core/radar.js';
import { purgarRegistrosCorrompidosHistorico, semearCatalogoCanonicoTCG } from '../db/database.js';

import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let publicPath = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicPath)) {
  publicPath = path.resolve(__dirname, '../../src/public');
}

export async function createServer() {
  const app = Fastify({
    logger: { level: 'info' }
  });

  // Parser robusto para Content-Type application/json que tolera bodies vazios
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body: string, done) => {
    if (!body || body.trim() === '') {
      return done(null, {});
    }
    try {
      const json = JSON.parse(body);
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(fastifyWebsocket);

  // Servir frontend estático com controle de cache estrito
  await app.register(fastifyStatic, {
    root: publicPath,
    prefix: '/',
    setHeaders: (res, pathName) => {
      if (pathName.endsWith('.html') || pathName.endsWith('.js') || pathName.endsWith('.css')) {
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', '0');
      }
    }
  });

  // Hook de Autenticação Global
  app.addHook('onRequest', async (req, reply) => {
    const url = req.raw.url || '';
    const pathname = url.split('?')[0];

    // Rotas públicas e assets estáticos que não requerem autenticação
    if (
      pathname === '/health' ||
      pathname === '/api/auth/login' ||
      pathname === '/login.html' ||
      pathname === '/favicon.svg' ||
      pathname === '/manifest.json' ||
      pathname.startsWith('/api/webhooks/') ||
      pathname.startsWith('/api/integrations/meli/callback') ||
      pathname.startsWith('/api/integrations/meli/auth') ||
      /\.(css|js|svg|png|jpg|jpeg|ico|woff2|woff|ttf|map|webmanifest)$/i.test(pathname)
    ) {
      if (pathname === '/login.html') {
        const token = extractSessionToken(req);
        if (token && verifySessionToken(token).valid) {
          return reply.redirect('/', 302);
        }
      }
      return;
    }

    // Validação de token de sessão
    const token = extractSessionToken(req);
    const auth = verifySessionToken(token);

    if (!auth.valid) {
      const accept = req.headers.accept || '';
      if (
        accept.includes('text/html') ||
        pathname === '/' ||
        pathname === '/index.html' ||
        (!pathname.startsWith('/api') && !pathname.includes('.'))
      ) {
        return reply.redirect('/login.html', 302);
      }

      return reply.status(401).send({
        ok: false,
        error: 'Não autorizado. Faça login para acessar este recurso.'
      });
    }
  });

  // Rota de Healthcheck (acessível pelo Railway monitor)
  app.get('/health', async () => {
    return { status: 'ok', time: new Date().toISOString() };
  });

  // Endpoints de Autenticação com SSO Unificado
  app.post('/api/auth/login', async (req, reply) => {
    const { username, password } = (req.body as any) || {};
    if (!verifyCredentials(username, password)) {
      return reply.status(401).send({ ok: false, error: 'Usuário ou senha incorretos' });
    }

    const token = createSessionToken(username);
    reply.header('Set-Cookie', [
      buildSessionCookie(token),
      `promo_disparador_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
    ]);
    return { ok: true, message: 'Login realizado com sucesso', token };
  });

  app.post('/api/auth/logout', async (req, reply) => {
    reply.header('Set-Cookie', [
      buildClearCookie(),
      'promo_disparador_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax'
    ]);
    return { ok: true, message: 'Logout realizado com sucesso' };
  });

  app.get('/api/auth/me', async (req, reply) => {
    const token = extractSessionToken(req);
    const auth = verifySessionToken(token);
    return { ok: auth.valid, username: auth.username };
  });

  // API REST: Status Unificado da Plataforma (Replicador + Meli)
  app.get('/api/unified-status', async () => {
    return {
      replica: {
        whatsapp: whatsAppManager.getState(),
        isAtivo: getConfig('ativo', 'true') === 'true',
        postsLastHour: getPostsLastHour(),
        totalEnviadosHoje: getTotalEnviadosHoje(),
        cookieStatus: currentCookieStatus
      },
      bot: {
        online: false,
        whatsapp: 'disconnected'
      },
      timestamp: new Date().toISOString()
    };
  });

  // Conjunto de conexões WebSocket ativas
  const wsClients = new Set<any>();

  function broadcast(event: string, data: any) {
    const payload = JSON.stringify({ event, data });
    for (const client of wsClients) {
      if (client.readyState === 1) {
        // OPEN
        client.send(payload);
      }
    }
  }

  // Sentinel de Cookie Mercado Livre
  let currentCookieStatus = {
    status: 'missing' as 'valid' | 'warning' | 'expired' | 'missing',
    lastChecked: new Date().toISOString(),
    message: 'Nenhum cookie configurado'
  };

  async function checkMeliCookieHealth() {
    const cookie = getConfig('meli_cookie', '').trim();
    const tag = getConfig('meli_tag', getConfig('affiliate_matt_word', 'caed1312314'));

    if (!cookie || cookie.length < 10) {
      currentCookieStatus = {
        status: 'missing',
        lastChecked: new Date().toISOString(),
        message: 'Nenhum cookie configurado'
      };
      return currentCookieStatus;
    }

    const testUrl = 'https://www.mercadolivre.com.br/deck-pokemon-espada-e-escudo-rillaboom-copag/p/MLB27197917';
    try {
      const shortUrl = await shortenToMeli(testUrl, cookie, tag);
      if (shortUrl && shortUrl.startsWith('https://meli.la/')) {
        currentCookieStatus = {
          status: 'valid',
          lastChecked: new Date().toISOString(),
          message: 'Cookie válido e encurtador meli.la ativo'
        };
      } else {
        currentCookieStatus = {
          status: 'expired',
          lastChecked: new Date().toISOString(),
          message: 'Cookie recusado pelo Mercado Livre (sessão expirada)'
        };
        await notificarAdminCookieExpirado();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      currentCookieStatus = {
        status: 'warning',
        lastChecked: new Date().toISOString(),
        message: `Aviso no teste do cookie: ${msg}`
      };
    }
    return currentCookieStatus;
  }

  async function notificarAdminCookieExpirado(): Promise<void> {
    try {
      const COOLDOWN_ALERTA_MS = 12 * 60 * 60 * 1000; // 12 horas de cooldown
      const ultimoAlertaStr = getConfig('ultimo_alerta_cookie_expirado', '0');
      const ultimoAlerta = parseInt(ultimoAlertaStr, 10) || 0;
      const agora = Date.now();

      if (agora - ultimoAlerta < COOLDOWN_ALERTA_MS) {
        return; // Alerta em cooldown
      }

      const adminNumeroConfig = getConfig('admin_whatsapp_numero', '').trim().replace(/\D/g, '');
      const userPhone = whatsAppManager.getState().userPhone;
      const numeroDestino = adminNumeroConfig || userPhone;

      if (!numeroDestino || whatsAppManager.getState().status !== 'connected') {
        return;
      }

      const toChatId = numeroDestino.includes('@') ? numeroDestino : `${numeroDestino}@s.whatsapp.net`;
      const textoAlerta = `⚠️ *[ALERTA AUTOMÁTICO - PROMO POKÉMON TCG]* ⚡\n\nIdentificamos que o seu Cookie de Afiliado do Mercado Livre *EXPIROU* ou perdeu a validade.\n\n🛡️ *Fique tranquilo:* O robô continua funcionando normalmente e entregando todas as ofertas através da sua Vitrine Oficial!\n\nPorém, quando tiver um tempinho, acesse o painel para colar o novo cookie e reativar o encurtador *meli.la*:\n👉 http://108.174.145.77:3000\n\n_(Este aviso proativo é enviado no máximo 1 vez a cada 12 horas)_`;

      const enviado = await whatsAppManager.sendDirectMessage(toChatId, textoAlerta);
      if (enviado) {
        setConfig('ultimo_alerta_cookie_expirado', agora.toString());
        console.log(`[Sentinela Cookie] Alerta de cookie expirado enviado com sucesso para ${toChatId}.`);
      }
    } catch (errNotif) {
      console.warn('[Sentinela Cookie] Falha ao enviar alerta de cookie no WhatsApp:', errNotif);
    }
  }

  // Verificação inicial após boot do servidor
  setTimeout(async () => {
    const res = await checkMeliCookieHealth();
    broadcast('cookie_status', res);
  }, 3500);

  // Verificação periódica a cada 45 minutos
  setInterval(async () => {
    const res = await checkMeliCookieHealth();
    broadcast('cookie_status', res);
  }, 45 * 60 * 1000);

  // Monitorar eventos do WhatsApp e transmitir para o painel via WebSocket
  whatsAppManager.onStateChange((state: WhatsAppState) => {
    broadcast('whatsapp_state', state);
  });

  whatsAppManager.onMessageProcessed((log) => {
    broadcast('new_log', log);
    broadcast('stats_update', {
      postsLastHour: getPostsLastHour(),
      totalEnviadosHoje: getRecentLogs(100).filter((l) => l.status === 'enviado').length
    });
  });

  // Rota WebSocket para o dashboard
  app.get('/ws', { websocket: true }, (socket, req) => {
    wsClients.add(socket);

    // Enviar estado inicial imediatamente na conexão
    socket.send(
      JSON.stringify({
        event: 'init',
        data: {
          whatsapp: whatsAppManager.getState(),
          configs: getAllConfigs(),
          rotas: getAllRotas(),
          chats: getCachedChats(),
          logs: getRecentLogs(30),
          cookieStatus: currentCookieStatus,
          stats: {
            postsLastHour: getPostsLastHour(),
            totalEnviadosHoje: getRecentLogs(100).filter((l) => l.status === 'enviado').length
          }
        }
      })
    );

    socket.on('close', () => {
      wsClients.delete(socket);
    });
  });

  // API REST: Obter estado geral
  app.get('/api/status', async () => {
    return {
      whatsapp: whatsAppManager.getState(),
      isAtivo: getConfig('ativo', 'true') === 'true',
      postsLastHour: getPostsLastHour(),
      cookieStatus: currentCookieStatus,
      configs: getAllConfigs()
    };
  });

  // API REST: Forçar checagem do Cookie do Mercado Livre
  app.post('/api/cookie/check', async () => {
    const res = await checkMeliCookieHealth();
    broadcast('cookie_status', res);
    return { ok: true, ...res };
  });

  // API REST: Configurações (suporte a /api/configs e alias /api/config)
  const handleGetConfigs = async () => {
    return getAllConfigs();
  };
  app.get('/api/configs', handleGetConfigs);
  app.get('/api/config', handleGetConfigs);

  const handlePostConfigs = async (req: any, reply: any) => {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return reply.status(400).send({ error: 'Corpo da requisição obrigatório' });
    }

    if (typeof body.chave === 'string') {
      const { chave, valor } = body;
      setConfig(chave, String(valor));
      broadcast('config_updated', { chave, valor });

      if (chave === 'meli_cookie') {
        setTimeout(async () => {
          const res = await checkMeliCookieHealth();
          broadcast('cookie_status', res);
        }, 500);
      }

      return { ok: true, chave, valor };
    }

    let updatedCount = 0;
    let hasMeliCookie = false;
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        setConfig(k, String(v));
        updatedCount++;
        if (k === 'meli_cookie') hasMeliCookie = true;
      }
    }

    if (hasMeliCookie) {
      setTimeout(async () => {
        const res = await checkMeliCookieHealth();
        broadcast('cookie_status', res);
      }, 500);
    }

    broadcast('configs_updated', getAllConfigs());
    return { ok: true, updated: updatedCount };
  };
  app.post('/api/configs', handlePostConfigs);
  app.post('/api/config', handlePostConfigs);

  // API REST: Rotas (com enriquecimento para total compatibilidade com frontend legado e moderno)
  app.get('/api/rotas', async () => {
    const rotas = getAllRotas();
    return rotas.map(r => ({
      ...r,
      ativo: r.ativa,
      origem_id: r.origens[0] || '',
      origem_nome: r.nome || 'Grupo de Origem',
      destino_id: r.destinos[0] || '',
      destino_nome: r.destinos.length > 1 ? `${r.destinos.length} grupos destino` : (r.destinos[0] || 'Destino')
    }));
  });

  app.post<{
    Body: { id?: number; nome: string; ativa?: boolean; ativo?: boolean; origens?: string[]; destinos?: string[] };
  }>('/api/rotas', async (req, reply) => {
    const { nome, ativa, ativo, origens, destinos, id } = req.body;
    if (!nome || !String(nome).trim()) return reply.status(400).send({ error: 'Nome da rota é obrigatório' });
    const isAtiva = ativa !== undefined ? Boolean(ativa) : (ativo !== undefined ? Boolean(ativo) : true);
    const cleanOrigens = Array.isArray(origens)
      ? Array.from(new Set(origens.map(o => String(o || '').trim()).filter(Boolean)))
      : [];
    const cleanDestinos = Array.isArray(destinos)
      ? Array.from(new Set(destinos.map(d => String(d || '').trim()).filter(Boolean)))
      : [];
    const rotaId = saveRota({ id, nome: String(nome).trim(), ativa: isAtiva, origens: cleanOrigens, destinos: cleanDestinos });
    broadcast('rotas_updated', getAllRotas());
    return { ok: true, id: rotaId };
  });

  // Toggle e atualização de rotas: suporte a POST /toggle, PATCH e PUT
  const handleToggleRota = async (req: any) => {
    const id = parseInt(req.params.id, 10);
    const body = req.body || {};
    const ativo = body.ativa !== undefined ? Boolean(body.ativa) : (body.ativo !== undefined ? Boolean(body.ativo) : true);
    toggleRota(id, ativo);
    broadcast('rotas_updated', getAllRotas());
    return { ok: true, id, ativo };
  };
  app.post('/api/rotas/:id/toggle', handleToggleRota);
  app.patch('/api/rotas/:id', handleToggleRota);
  app.put('/api/rotas/:id', handleToggleRota);

  app.delete<{ Params: { id: string } }>('/api/rotas/:id', async (req) => {
    const id = parseInt(req.params.id, 10);
    deleteRota(id);
    broadcast('rotas_updated', getAllRotas());
    return { ok: true };
  });

  // API REST: Grupos e Chats (compatível com id e chat_id)
  app.get('/api/chats', async () => {
    const chats = getCachedChats();
    return chats.map(c => ({
      id: c.chat_id,
      chat_id: c.chat_id,
      nome: c.nome,
      is_group: c.is_group
    }));
  });

  app.post('/api/chats/sync', async () => {
    await whatsAppManager.syncGroups(true);
    const chats = getCachedChats().map(c => ({
      id: c.chat_id,
      chat_id: c.chat_id,
      nome: c.nome,
      is_group: c.is_group
    }));
    broadcast('chats_updated', chats);
    return { ok: true, total: chats.length, chats };
  });

  // API REST: Logs recentes com normalização DTO de campos
  app.get<{ Querystring: { limit?: string } }>('/api/logs', async (req) => {
    const limit = Math.min(parseInt(req.query?.limit || '60', 10) || 60, 200);
    const logs = getRecentLogs(limit);
    return logs.map(l => ({
      ...l,
      origem: l.origem_nome || l.origem_chat_id || 'Grupo Desconhecido',
      destino: l.destino_chat_id || 'Destino',
      texto: l.texto_publicado || l.texto_original || '',
      foto_url: l.tem_foto ? '/foto' : null,
      status: l.status === 'enviado' ? 'enviado' : 'ignorado',
      motivo: l.motivo || null,
      criado_em: l.criado_em
    }));
  });

  // API REST: Fluxo Horário em Tempo Real para o Dashboard (Cliques & Ofertas)
  app.get('/api/dashboard/fluxo-horario', async () => {
    const fluxo = getFluxoHorarioHoje();
    return { ok: true, data: fluxo };
  });

  // API REST: Desconectar WhatsApp
  app.post('/api/whatsapp/logout', async () => {
    await whatsAppManager.logout();
    setTimeout(() => whatsAppManager.start(), 1000);
    return { ok: true, message: 'WhatsApp desconectado. Novo QR Code será gerado.' };
  });

  // API REST: Resetar sessão e forçar novo QR Code
  app.post('/api/whatsapp/reset', async () => {
    await whatsAppManager.resetSession();
    return { ok: true, message: 'Sessão resetada com sucesso. Gerando novo QR Code...' };
  });

  // API REST: Testar Cookie do Mercado Livre
  app.post<{ Body: { cookie: string; tag?: string } }>('/api/test-meli-cookie', async (req, reply) => {
    const { cookie, tag } = req.body || {};
    if (!cookie || !cookie.trim()) {
      return reply.status(400).send({ ok: false, error: 'Cole o cookie do Mercado Livre para realizar o teste.' });
    }

    const testUrl = 'https://www.mercadolivre.com.br/deck-pokemon-espada-e-escudo-rillaboom-copag/p/MLB27197917';
    try {
      const shortUrl = await shortenToMeli(testUrl, cookie, tag || 'myshoplist');
      if (shortUrl) {
        return { ok: true, shortUrl, message: `Cookie Válido! Link de teste gerado: ${shortUrl}` };
      } else {
        return reply.status(400).send({
          ok: false,
          error: 'O Mercado Livre recusou a requisição. O cookie informado pode estar expirado ou incompleto.'
        });
      }
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: err?.message || 'Erro inesperado ao conectar ao Mercado Livre.' });
    }
  });

  // API REST: Autodetectar link curto da vitrine / lista de compras no Mercado Livre
  app.post<{ Body: { mattWord?: string } }>('/api/detect-social-link', async (req, reply) => {
    const mattWord = (req.body?.mattWord || getConfig('affiliate_matt_word', CONFIG.defaultMattWord)).trim();
    if (!mattWord) {
      return reply.status(400).send({ ok: false, error: 'Informe o apelido (matt_word).' });
    }

    try {
      const shortLink = await fetchSocialShortLink(mattWord);
      if (shortLink) {
        return { ok: true, shortLink, message: `Link oficial encontrado: ${shortLink}` };
      }
      return reply.status(404).send({
        ok: false,
        error: 'Não foi possível detectar o link curto da vitrine automaticamente. Cole manualmente o link curto compartilhado do app.'
      });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: err?.message || 'Erro ao buscar link da vitrine.' });
    }
  });

  // API REST: Laboratório de Testes (Simulador de Pipeline)
  app.post<{ Body: { text: string } }>('/api/test-pipeline', async (req, reply) => {
    const { text } = req.body || {};
    if (!text || !text.trim()) {
      return reply.status(400).send({ ok: false, error: 'Digite ou cole uma mensagem para testar a esteira.' });
    }

    try {
      const mattWord = getConfig('affiliate_matt_word', CONFIG.defaultMattWord);
      const mattTool = getConfig('affiliate_matt_tool', CONFIG.defaultMattTool);
      const frasesRemover = getConfig('frases_remover', '@rasgabooster.tcg\n#rasgaboot\n@rasgabooster');
      const meliCookie = getConfig('meli_cookie', '');
      const meliTag = getConfig('meli_tag', mattWord);
      const linkVitrineCurto = getConfig('link_vitrine_curto', 'https://mercadolivre.com/sec/2rM6RPm');

      const result = await processMessageText(
        text,
        'simulacao@test',
        mattWord,
        mattTool,
        frasesRemover,
        meliCookie,
        meliTag,
        linkVitrineCurto
      );

      const cupomExtraido = extrairCupom(text) || '';
      const isCupom = Boolean(cupomExtraido || detectarMensagemCupom(text) || /\bcupo(?:m|ns)\b/i.test(text));

      let imagePreviewUrl: string | null = null;
      if (!isCupom) {
        if (result.productImageUrl) {
          imagePreviewUrl = result.productImageUrl;
        } else if (result.resolvedProductUrl) {
          const imgBuf = await downloadProductImage(result.resolvedProductUrl);
          if (imgBuf) {
            imagePreviewUrl = `data:image/jpeg;base64,${imgBuf.toString('base64')}`;
          }
        }
      } else {
        imagePreviewUrl = FOTO_CUPOM_OFICIAL_URL;
      }

      const isMeliActive = Boolean(meliCookie && meliCookie.trim().length > 10);

      const dadosOferta = extrairDadosOferta(result.novoTexto, result.resolvedProductUrl);
      const slugParaFiltro = result.resolvedProductUrl ? result.resolvedProductUrl.split('/').pop() || '' : '';
      const isTCG = isProdutoTCG(text, dadosOferta.produto, slugParaFiltro);

      const isMsgCupomGeral = Boolean(
        isCupom ||
        detectarMensagemCupom(text) ||
        /\bcupo(?:m|ns)\b/i.test(text)
      );

      const hasCanonicalProduct = Boolean(
        result.canonicalProductId &&
        !result.canonicalProductId.startsWith('CUPOM_')
      );
      const hasPrecoValido = Boolean(
        (dadosOferta.valorPor && dadosOferta.valorPor !== 'Consultar' && dadosOferta.valorPor !== 'R$ 0') ||
        (dadosOferta.valorDe && dadosOferta.valorDe !== 'Consultar' && dadosOferta.valorDe !== 'R$ 0')
      );
      const isTituloProduto = Boolean(
        dadosOferta.produto &&
        dadosOferta.produto !== 'Colecionável Pokémon TCG' &&
        dadosOferta.produto !== 'Cupons de Desconto Mercado Livre' &&
        !dadosOferta.produto.toLowerCase().includes('cupom') &&
        !dadosOferta.produto.toLowerCase().includes('desconto')
      );

      const hasProdutoEspecifico = Boolean(
        hasCanonicalProduct ||
        (!isMsgCupomGeral && (
          (hasPrecoValido && isTituloProduto) ||
          Boolean(imagePreviewUrl)
        ))
      );

      const isPublicacaoCupomPuro = Boolean(isMsgCupomGeral && !hasCanonicalProduct);

      const tipoDetectado = isPublicacaoCupomPuro
        ? 'cupom'
        : determinarTipoMensagem({
            texto: text,
            hasProdutoEspecifico
          });

      const linkMatches = result.novoTexto.match(/https?:\/\/[^\s]+/gi);
      let linkAfiliadoFinal = linkMatches && linkMatches.length > 0 ? linkMatches[0] : (dadosOferta.link || linkVitrineCurto);
      if (isPublicacaoCupomPuro) {
        linkAfiliadoFinal = linkVitrineCurto;
      }
      const parcelamentoExtraido = extrairParcelamento(text);

      const templateTexto = formatarMensagemReplicada({
        tipo: tipoDetectado,
        titulo: dadosOferta.produto || 'Colecionável Pokémon TCG',
        precoDe: dadosOferta.valorDe,
        precoPor: dadosOferta.valorPor,
        precoUnitario: dadosOferta.valorUnitario || extrairPrecoUnitario(text) || undefined,
        parcelamento: parcelamentoExtraido || undefined,
        cupom: cupomExtraido,
        detalhesCupom: tipoDetectado === 'cupom' ? 'Desconto especial no app para colecionáveis' : undefined,
        linkAfiliado: linkAfiliadoFinal,
        linkVitrineCurto,
        textoOriginalHigienizado: result.novoTexto
      });

      const templateModo = getConfig('template_modo', 'padrao');

      return {
        ok: true,
        originalText: text,
        novoTexto: templateModo === 'padrao' ? templateTexto : result.novoTexto,
        textoOriginalHigienizado: result.novoTexto,
        templateTexto,
        tipoDetectado,
        isTCG,
        canonicalProductId: result.canonicalProductId,
        linksConvertidos: result.linksConvertidos,
        contemMercadoLivre: result.contemMercadoLivre,
        imagePreviewUrl,
        templateModo,
        shortenerMode: isMeliActive ? 'meli.la (Encurtador Oficial)' : 'Parâmetros Diretos (Fallback matt_word)'
      };
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: err?.message || 'Erro ao processar simulação.' });
    }
  });

  // API REST: Disparar Teste Real para o WhatsApp
  app.post<{ Body: { chatId: string; text: string; imageBase64?: string } }>('/api/test-send', async (req, reply) => {
    const { chatId, text, imageBase64 } = req.body || {};
    if (!chatId) return reply.status(400).send({ ok: false, error: 'Selecione um grupo de destino para o teste.' });
    if (!text || !text.trim()) return reply.status(400).send({ ok: false, error: 'Texto da mensagem não pode ser vazio.' });

    try {
      let imageBuffer: Buffer | null = null;
      if (imageBase64 && imageBase64.includes('base64,')) {
        const rawBase64 = imageBase64.split('base64,')[1];
        imageBuffer = Buffer.from(rawBase64, 'base64');
      }

      await whatsAppManager.sendDirectMessage(chatId, text, imageBuffer);
      return { ok: true, message: 'Mensagem de teste enviada com sucesso no grupo!' };
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: err?.message || 'Falha ao disparar para o WhatsApp.' });
    }
  });

  // Handler compartilhado para extração de anúncio (compatível com Mercado Livre, Shopee e outros marketplaces)
  async function handleExtrairAnuncio(body: any, reply: any) {
    const rawUrl = (body?.url || body?.link || '').trim();
    if (!rawUrl) {
      return reply.status(400).send({ ok: false, error: 'Cole o link do Mercado Livre ou Shopee para gerar o anúncio.' });
    }

    try {
      const mattWord = getConfig('affiliate_matt_word', CONFIG.defaultMattWord);
      const mattTool = getConfig('affiliate_matt_tool', CONFIG.defaultMattTool);
      const meliCookie = getConfig('meli_cookie', '');
      const meliTag = getConfig('meli_tag', mattWord);
      const linkVitrineCurto = getConfig('link_vitrine_curto', 'https://mercadolivre.com/sec/2rM6RPm');

      const precoDe = body?.precoDe !== undefined ? String(body.precoDe) : undefined;
      const precoPor = body?.precoPor !== undefined ? String(body.precoPor) : undefined;
      const valorComCupom = body?.valorComCupom !== undefined ? String(body.valorComCupom) : undefined;
      const cupom = body?.cupom !== undefined ? String(body.cupom) : undefined;
      const parcelamento = body?.parcelamento !== undefined ? String(body.parcelamento) : undefined;

      const dados = await extrairDadosAnuncio(
        { url: rawUrl, cupom, precoDe, precoPor, valorComCupom, parcelamento },
        { mattWord, mattTool, meliCookie, meliTag, linkVitrineCurto }
      );

      return {
        ok: true,
        mensagem: dados.textoGerado,
        textoGerado: dados.textoGerado,
        fotoUrl: dados.imageUrl,
        imageUrl: dados.imageUrl,
        titulo: dados.titulo,
        linkAfiliado: dados.linkAfiliado,
        resolvedUrl: dados.resolvedUrl,
        precoDe: dados.precoDe,
        precoPor: dados.precoPor,
        cupom: dados.cupom,
        valorComCupom: dados.valorComCupom,
        parcelamento: dados.parcelamento
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ ok: false, error: msg || 'Erro ao extrair dados do anúncio.' });
    }
  }

  // Endpoints de Extração (compatibilidade universal /api/anuncio/extrair e /api/gerador/anuncio)
  app.post('/api/anuncio/extrair', async (req, reply) => handleExtrairAnuncio(req.body, reply));
  app.post('/api/gerador/anuncio', async (req, reply) => handleExtrairAnuncio(req.body, reply));

  // Handler compartilhado para publicação e disparo de anúncio com auto-destinos inteligentes
  async function handlePublicarAnuncio(body: any, reply: any) {
    const texto = (body?.texto || body?.mensagem || '').trim();
    if (!texto) {
      return reply.status(400).send({ ok: false, error: 'O texto do anúncio não pode estar vazio.' });
    }

    const imageUrl = (body?.imageUrl || body?.fotoUrl || '').trim();
    let destinos: string[] = Array.isArray(body?.destinos) ? body.destinos.filter(Boolean) : [];

    // Se nenhum destino foi especificado manualmente, obtém automaticamente das rotas ativas
    if (destinos.length === 0) {
      destinos = obterDestinosAtivos();
    }

    if (destinos.length === 0) {
      return reply.status(400).send({
        ok: false,
        error: 'Nenhum grupo de destino encontrado nas rotas ativas. Ative pelo menos uma rota com grupos de destino para disparar.'
      });
    }

    try {
      let imageBuffer: Buffer | null = null;
      if (imageUrl && imageUrl.includes('cupom-mercadolivre.png')) {
        imageBuffer = obterFotoCupomBuffer();
      } else if (imageUrl && imageUrl.startsWith('http')) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const res = await fetch(imageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: controller.signal
          });
          clearTimeout(timeout);
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuf);
          }
        } catch (e) {
          console.warn('[Publicar Anúncio] Falha ao baixar imagem remota:', e);
        }
      } else if (!imageUrl && (texto.toLowerCase().includes('cupom') || /\bcupo(?:m|ns)\b/i.test(texto))) {
        imageBuffer = obterFotoCupomBuffer();
      }

      let enviados = 0;
      const falhas: string[] = [];

      for (const destino of destinos) {
        try {
          await whatsAppManager.sendDirectMessage(destino, texto, imageBuffer);
          enviados++;

          insertLog({
            origem_chat_id: 'gerador_manual',
            origem_nome: 'Gerador Manual de Anúncios',
            destino_chat_id: destino,
            hash_conteudo: `manual_${Date.now()}_${Math.random()}`,
            texto_original: texto,
            texto_publicado: texto,
            tem_foto: Boolean(imageBuffer && imageBuffer.length > 0),
            links_convertidos: 1,
            status: 'enviado',
            motivo: 'disparo_manual_gerador'
          });
        } catch (err: unknown) {
          console.error(`Erro ao disparar para ${destino}:`, err);
          falhas.push(destino);
        }
      }

      if (enviados > 0) {
        try {
          const dadosOferta = extrairDadosOferta(texto, imageUrl, 'Gerador Manual');
          registrarOfertaPlanilha(dadosOferta).catch((e: unknown) => {
            console.warn('[Google Sheets] Erro em background ao registrar anúncio manual:', e);
          });
        } catch (e: unknown) {
          console.warn('[Google Sheets] Falha ao extrair dados do anúncio manual:', e);
        }
      }

      broadcast('stats_update', {
        postsLastHour: getPostsLastHour(),
        totalEnviadosHoje: getRecentLogs(100).filter((l) => l.status === 'enviado').length
      });
      broadcast('logs_update', getRecentLogs(30));

      return {
        ok: true,
        enviados,
        totalEnviados: enviados,
        totalDestinos: destinos.length,
        falhas,
        message: `Anúncio publicado com sucesso em ${enviados} de ${destinos.length} grupo(s)!`
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ ok: false, error: msg || 'Falha ao publicar anúncio.' });
    }
  }

  // Endpoints de Publicação (compatibilidade universal /api/anuncio/publicar e /api/gerador/disparar)
  app.post('/api/anuncio/publicar', async (req, reply) => handlePublicarAnuncio(req.body, reply));
  app.post('/api/gerador/disparar', async (req, reply) => handlePublicarAnuncio(req.body, reply));

  // API REST: Configuração do Google Sheets
  app.get('/api/sheets/config', async () => {
    return {
      webhookUrl: getConfig('google_sheets_webhook_url', ''),
      ativo: getConfig('google_sheets_ativo', 'true') === 'true',
      appsScriptCode: APPS_SCRIPT_TEMPLATE
    };
  });

  app.post<{ Body: { webhookUrl?: string; ativo?: boolean } }>('/api/sheets/config', async (req) => {
    const { webhookUrl, ativo } = req.body || {};
    if (webhookUrl !== undefined) {
      setConfig('google_sheets_webhook_url', webhookUrl.trim());
    }
    if (ativo !== undefined) {
      setConfig('google_sheets_ativo', ativo ? 'true' : 'false');
    }
    return { ok: true, message: 'Configurações do Google Planilhas salvas com sucesso!' };
  });

  // API REST: Disparar Linha de Teste para o Google Sheets
  app.post<{ Body: { webhookUrl?: string } }>('/api/sheets/test', async (req, reply) => {
    const customUrl = req.body?.webhookUrl;
    const testOferta = {
      data: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      produto: '🧪 Teste de Conexão - Pokémon TCG Charizard ex',
      valorPor: 'R$ 199,90',
      valorDe: 'R$ 299,90',
      link: 'https://meli.la/exemplo-teste',
      grupo: 'Painel Web (Teste)'
    };

    const resultado = await registrarOfertaPlanilha(testOferta, customUrl);
    if (resultado.ok) {
      return { ok: true, message: 'Linha de teste adicionada com sucesso no Google Planilhas!' };
    } else {
      return reply.status(400).send({
        ok: false,
        error: resultado.error || 'Falha ao conectar com o Google Sheets Webhook.'
      });
    }
  });

  // ==========================================
  // API REST: BASE DE PREÇOS TCG (PLANILHA NATIVA)
  // ==========================================

  // Listar produtos consolidados com Menor Preço e Maior Preço histórico
  app.get<{
    Querystring: { busca?: string; limite?: string; offset?: string };
  }>('/api/produtos-valores', async (req) => {
    const busca = req.query.busca || '';
    const limite = req.query.limite ? Math.min(Math.max(parseInt(req.query.limite, 10), 1), 500) : 100;
    const offset = req.query.offset ? Math.max(parseInt(req.query.offset, 10), 0) : 0;

    const res = getHistoricoProdutosConsolidado(busca, limite, offset);
    return {
      ok: true,
      itens: res.itens,
      total: res.total,
      limite,
      offset
    };
  });

  // Buscar benchmark imediato para balizar precificação no Gerador de Anúncios
  app.get<{
    Querystring: { termo?: string };
  }>('/api/produtos-valores/benchmark', async (req) => {
    const termo = (req.query.termo || '').trim();
    if (!termo || termo.length < 2) {
      return { ok: true, benchmark: { encontrado: false } };
    }

    const benchmark = buscarBenchmarkPreco(termo);
    return {
      ok: true,
      benchmark
    };
  });

  // Obter extrato detalhado de postagens de um produto específico
  app.get<{
    Querystring: { produto?: string; limite?: string };
  }>('/api/produtos-valores/extrato', async (req) => {
    const produto = (req.query.produto || '').trim();
    const limite = req.query.limite ? Math.min(Math.max(parseInt(req.query.limite, 10), 1), 200) : 50;

    if (!produto) {
      return { ok: true, registros: [] };
    }

    const registros = getExtratoProdutoValores(produto, limite);
    return {
      ok: true,
      registros
    };
  });

  // Forçar sincronização/migração retroativa de logs
  app.post('/api/produtos-valores/migrar', async () => {
    const inseridos = migrarLogsParaHistoricoProdutos();
    return {
      ok: true,
      inseridos,
      message: `${inseridos} produtos inseridos ou atualizados a partir do histórico de postagens.`
    };
  });

  // API REST: Agendador Diário - Obter Status e Configurações
  app.get('/api/agendador/status', async () => {
    const { horaFormatada, dataFormatada, diaSemana } = obterHoraBrasilia();
    const destinos = obterDestinosAtivos();
    const texto = getConfig('msg_abertura_texto', DEFAULT_MSG_ABERTURA);

    return {
      ativo: getConfig('msg_abertura_ativa', 'true') === 'true',
      horario: getConfig('msg_abertura_horario', '07:00'),
      texto,
      modelos: PRESET_MSGS_ABERTURA,
      previa: prepararTextoMensagemAbertura(texto, diaSemana),
      ultimoEnvio: getConfig('msg_abertura_ultimo_envio', ''),
      horaAtualBrasilia: horaFormatada,
      dataFormatadaBrasilia: dataFormatada,
      diaSemana,
      destinosCount: destinos.length,
      destinos
    };
  });

  // API REST: Agendador Diário - Salvar Configurações
  app.post<{ Body: { ativo?: boolean; horario?: string; texto?: string } }>(
    '/api/agendador/config',
    async (req) => {
      const { ativo, horario, texto } = req.body || {};
      if (ativo !== undefined) {
        setConfig('msg_abertura_ativa', ativo ? 'true' : 'false');
      }
      if (horario !== undefined && /^\d{2}:\d{2}$/.test(horario.trim())) {
        setConfig('msg_abertura_horario', horario.trim());
      }
      if (texto !== undefined && texto.trim()) {
        setConfig('msg_abertura_texto', texto.trim());
      }
      return { ok: true, message: 'Configurações da mensagem de abertura salvas com sucesso!' };
    }
  );

  // API REST: Agendador Diário - Testar Envio Imediato
  app.post('/api/agendador/testar', async (req, reply) => {
    const res = await dispararMensagemAbertura(whatsAppManager, true, 1500);
    if (res.sucesso) {
      return {
        ok: true,
        totalEnviados: res.totalEnviados,
        message: `Mensagem de abertura enviada com sucesso para ${res.totalEnviados} grupo(s) de destino!`
      };
    } else {
      let msg = 'Falha ao enviar mensagem de abertura.';
      if (res.motivo === 'whatsapp_desconectado') {
        msg = 'WhatsApp desconectado. Conecte o WhatsApp para realizar o envio.';
      } else if (res.motivo === 'sem_destinos_ativos') {
        msg = 'Nenhum grupo de destino ativo configurado nas rotas.';
      }
      return reply.status(400).send({ ok: false, motivo: res.motivo, error: msg });
    }
  });

  // ==========================================
  // API REST: Radar de Preços TCG (Busca & Personal Shopper 1-a-1)
  // ==========================================
  app.post<{
    Body: {
      query: string;
      filtros?: FiltrosRadar;
    };
  }>('/api/radar/buscar', async (req, reply) => {
    const { query, filtros } = req.body || {};
    if (!query || !query.trim()) {
      return reply.status(400).send({ ok: false, error: 'Por favor, informe um termo de busca ou link do produto.' });
    }

    let accessToken: string | undefined;
    try {
      accessToken = await meliService.getValidAccessToken();
    } catch {
      // Continua sem token se não estiver configurado
    }

    const res = await buscarNoRadar(
      query.trim(),
      filtros || { apenasOficiaisOuPlatinum: true, apenasNovos: true },
      accessToken
    );

    if (!res.ok && res.total === 0) {
      return reply.status(200).send(res);
    }
    return res;
  });

  app.post<{
    Body: {
      item: ResultadoRadarItem;
      tipo: 'cliente' | 'grupo';
      linkAfiliadoPersonalizado?: string;
    };
  }>('/api/radar/formatar-copy', async (req, reply) => {
    const { item, tipo, linkAfiliadoPersonalizado } = req.body || {};
    if (!item) {
      return reply.status(400).send({ ok: false, error: 'Item não fornecido para formatação de copy.' });
    }

    const linkFinal = linkAfiliadoPersonalizado || item.linkAfiliado;
    const copy = tipo === 'grupo' ? formatarCopyGrupo(item, linkFinal) : formatarCopyCliente(item, linkFinal);

    return { ok: true, copy };
  });

  app.post<{
    Body: {
      produto: string;
      precoPor: number;
      precoDe?: number;
      precoUnitario?: number;
      link?: string;
      imagemUrl?: string;
    };
  }>('/api/radar/registrar-cotacao', async (req, reply) => {
    const { produto, precoPor, precoDe, precoUnitario, link, imagemUrl } = req.body || {};
    if (!produto || !precoPor) {
      return reply.status(400).send({ ok: false, error: 'Produto e Preço são obrigatórios.' });
    }

    const sucesso = registrarCotacaoManualRadar({
      produto,
      precoPor,
      precoDe,
      precoUnitario,
      link,
      imagemUrl
    });

    if (!sucesso) {
      return reply.status(400).send({ ok: false, error: 'Não foi possível registrar cotação (preço incompatível com piso ou produto inválido).' });
    }

    return { ok: true, mensagem: 'Cotação registrada com sucesso no histórico oficial!' };
  });

  app.post<{
    Body: {
      id?: string | number;
      chaveCanonica?: string;
      produto: string;
    };
  }>('/api/radar/deletar-item', async (req, reply) => {
    const { id, chaveCanonica, produto } = req.body || {};
    if (!produto && !chaveCanonica && !id) {
      return reply.status(400).send({ ok: false, error: 'Identificador do produto não fornecido.' });
    }

    const sucesso = excluirItemRadar({ id, chaveCanonica, produto: produto || '' });
    if (!sucesso) {
      return reply.status(500).send({ ok: false, error: 'Falha ao excluir item do Radar TCG.' });
    }

    return { ok: true, mensagem: 'Item excluído com sucesso do Radar e adicionado à lista de restrição!' };
  });

  app.post('/api/radar/recalibrar-historico', async (_req, reply) => {
    try {
      const deletados = purgarRegistrosCorrompidosHistorico();
      const semeados = semearCatalogoCanonicoTCG();
      return { ok: true, deletados, semeados, mensagem: 'Base histórica recalibrada com sucesso com referências canônicas!' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ ok: false, error: msg });
    }
  });

  // API REST: Estúdio IA de Redação Rápida (DeepSeek v4.1 + Fallback Local)
  app.post<{
    Body: {
      rascunho: string;
      link?: string;
      modo?: 'chamada' | 'anuncio';
    };
  }>('/api/ia/redigir-oferta', async (req, reply) => {
    const { rascunho, link, modo } = req.body || {};
    if (!rascunho || !rascunho.trim()) {
      return reply.status(400).send({ ok: false, error: 'Digite uma frase ou rascunho para a IA formatar.' });
    }

    try {
      let linkAfiliadoFinal = (link || '').trim();
      const modoFinal = modo || (linkAfiliadoFinal ? 'anuncio' : 'chamada');
      if (!linkAfiliadoFinal) {
        const urlMatch = rascunho.match(/https?:\/\/[^\s]+/i);
        if (urlMatch) {
          linkAfiliadoFinal = urlMatch[0];
        }
      }

      if (modoFinal === 'anuncio' && linkAfiliadoFinal) {
        const mattWord = getConfig('affiliate_matt_word', CONFIG.defaultMattWord);
        const mattTool = getConfig('affiliate_matt_tool', CONFIG.defaultMattTool);
        const meliCookie = getConfig('meli_cookie', '');
        const meliTag = getConfig('meli_tag', mattWord);
        const linkVitrineCurto = getConfig('link_vitrine_curto', 'https://mercadolivre.com/sec/2rM6RPm');

        const proc = await processMessageText(
          linkAfiliadoFinal,
          'ia_studio@test',
          mattWord,
          mattTool,
          '',
          meliCookie,
          meliTag,
          linkVitrineCurto
        );
        const linksExtraidos = proc.novoTexto.match(/https?:\/\/[^\s]+/gi);
        if (linksExtraidos && linksExtraidos.length > 0) {
          linkAfiliadoFinal = linksExtraidos[0];
        }
      }

      const resIA = await redigirOfertaComIA({
        rascunho,
        link: modoFinal === 'anuncio' ? linkAfiliadoFinal : undefined,
        modo: modoFinal
      });

      return resIA;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ ok: false, error: msg });
    }
  });

  app.post<{
    Body: {
      texto: string;
    };
  }>('/api/ia/disparar-oferta', async (req, reply) => {
    const { texto } = req.body || {};
    if (!texto || !texto.trim()) {
      return reply.status(400).send({ ok: false, error: 'O texto da mensagem não pode estar vazio.' });
    }

    if (whatsAppManager.getState().status !== 'connected') {
      return reply.status(503).send({ ok: false, error: 'WhatsApp desconectado. Conecte o bot para disparar.' });
    }

    try {
      const destinos = obterDestinosAtivos();
      if (destinos.length === 0) {
        return reply.status(400).send({ ok: false, error: 'Nenhum grupo de destino ativo configurado nas Rotas.' });
      }

      let enviados = 0;
      for (const destinoChatId of destinos) {
        try {
          const ok = await whatsAppManager.sendDirectMessage(destinoChatId, texto.trim());
          if (ok) enviados++;
        } catch (errEnv) {
          console.warn(`[Disparo IA] Falha ao enviar para ${destinoChatId}:`, errEnv);
        }
      }

      const log = insertLog({
        origem_chat_id: 'painel_estudio_ia',
        origem_nome: 'Estúdio IA de Redação (Painel)',
        destino_chat_id: destinos.join(', '),
        hash_conteudo: `hash_ia_${Date.now()}`,
        texto_original: texto,
        texto_publicado: texto,
        tem_foto: false,
        links_convertidos: 1,
        status: enviados > 0 ? 'enviado' : 'erro',
        motivo: 'disparo_estudio_ia'
      });
      if (log) {
        broadcast('new_log', log);
      }

      return {
        ok: true,
        enviados,
        totalDestinos: destinos.length,
        mensagem: `Oferta enviada com sucesso para ${enviados} de ${destinos.length} grupos ativos!`
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ ok: false, error: msg });
    }
  });

  // Módulo de Ingestão Analítica (Mercado Livre + Meta Ads + PostgreSQL Drizzle)
  await setupAnalyticsModule(app);

  return app;
}
