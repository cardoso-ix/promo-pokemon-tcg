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
  getPostsLastHour
} from '../db/database.js';
import { whatsAppManager, WhatsAppState } from '../whatsapp/client.js';
import {
  shortenToMeli,
  processMessageText,
  downloadProductImage
} from '../core/affiliate.js';

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

  await app.register(fastifyWebsocket);

  // Servir frontend estático
  await app.register(fastifyStatic, {
    root: publicPath,
    prefix: '/'
  });

  // Rota de Healthcheck
  app.get('/health', async () => {
    return { status: 'ok', time: new Date().toISOString() };
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
      configs: getAllConfigs()
    };
  });

  // API REST: Configurações
  app.get('/api/configs', async () => {
    return getAllConfigs();
  });

  app.post<{ Body: { chave: string; valor: string } }>('/api/configs', async (req, reply) => {
    const { chave, valor } = req.body;
    if (!chave) return reply.status(400).send({ error: 'Chave obrigatória' });
    setConfig(chave, String(valor));
    broadcast('config_updated', { chave, valor });
    return { ok: true, chave, valor };
  });

  // API REST: Rotas
  app.get('/api/rotas', async () => {
    return getAllRotas();
  });

  app.post<{
    Body: { id?: number; nome: string; ativa: boolean; origens: string[]; destinos: string[] };
  }>('/api/rotas', async (req, reply) => {
    const { nome, ativa, origens, destinos, id } = req.body;
    if (!nome) return reply.status(400).send({ error: 'Nome da rota é obrigatório' });
    const rotaId = saveRota({ id, nome, ativa: Boolean(ativa), origens: origens || [], destinos: destinos || [] });
    broadcast('rotas_updated', getAllRotas());
    return { ok: true, id: rotaId };
  });

  app.post<{ Params: { id: string }; Body: { ativa: boolean } }>('/api/rotas/:id/toggle', async (req) => {
    const id = parseInt(req.params.id, 10);
    toggleRota(id, Boolean(req.body.ativa));
    broadcast('rotas_updated', getAllRotas());
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>('/api/rotas/:id', async (req) => {
    const id = parseInt(req.params.id, 10);
    deleteRota(id);
    broadcast('rotas_updated', getAllRotas());
    return { ok: true };
  });

  // API REST: Grupos e Chats
  app.get('/api/chats', async () => {
    return getCachedChats();
  });

  app.post('/api/chats/sync', async () => {
    await whatsAppManager.syncGroups(true);
    const chats = getCachedChats();
    broadcast('chats_updated', chats);
    return { ok: true, total: chats.length, chats };
  });

  // API REST: Logs recentes
  app.get('/api/logs', async () => {
    return getRecentLogs(50);
  });

  // API REST: Desconectar WhatsApp
  app.post('/api/whatsapp/logout', async () => {
    await whatsAppManager.logout();
    setTimeout(() => whatsAppManager.start(), 1000);
    return { ok: true, message: 'WhatsApp desconectado. Novo QR Code será gerado.' };
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

      const result = await processMessageText(
        text,
        'simulacao@test',
        mattWord,
        mattTool,
        frasesRemover,
        meliCookie,
        meliTag
      );

      let imagePreviewUrl: string | null = null;
      if (result.productImageUrl) {
        imagePreviewUrl = result.productImageUrl;
      } else if (result.resolvedProductUrl) {
        const imgBuf = await downloadProductImage(result.resolvedProductUrl);
        if (imgBuf) {
          imagePreviewUrl = `data:image/jpeg;base64,${imgBuf.toString('base64')}`;
        }
      }

      const isMeliActive = Boolean(meliCookie && meliCookie.trim().length > 10);

      return {
        ok: true,
        originalText: text,
        novoTexto: result.novoTexto,
        linksConvertidos: result.linksConvertidos,
        contemMercadoLivre: result.contemMercadoLivre,
        imagePreviewUrl,
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

  return app;
}
