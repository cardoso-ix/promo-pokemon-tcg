import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import path from 'node:path';
import fs from 'node:fs';
import {
  getConfig,
  setConfig,
  getAllConfigs,
  getContatos,
  upsertContato,
  clearContatos,
  getAllGrupos,
  getCampanhas,
  createCampanha,
  updateCampanhaStatus,
  getFilaCampanha,
  addItensFila,
  getLogsSistema,
  getMetricasDashboard,
  logSistema,
  db
} from '../db/database.js';
import { whatsapp, WhatsAppState } from '../whatsapp/client.js';
import { dispatchEngine } from '../core/engine.js';
import { renderMessageTemplate } from '../core/spintax.js';
import { generateDeepSeekResponse } from '../ai/deepseek.js';

export async function createServer() {
  const app = fastify({ logger: false });

  await app.register(fastifyMultipart, {
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB para mídias
  });

  const publicDir = fs.existsSync(path.resolve('src/public'))
    ? path.resolve('src/public')
    : path.resolve('dist/public');

  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/'
  });

  // SSE (Server-Sent Events) para atualizações em tempo real
  const sseClients = new Set<any>();

  app.get('/api/events', (req, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    reply.raw.write(`data: ${JSON.stringify({ type: 'init', state: whatsapp.state, metricas: getMetricasDashboard() })}\n\n`);
    sseClients.add(reply.raw);

    req.raw.on('close', () => {
      sseClients.delete(reply.raw);
    });
  });

  function broadcastEvent(type: string, data: any) {
    const msg = `data: ${JSON.stringify({ type, data })}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(msg);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  // Notificar mudanças de estado do WhatsApp
  whatsapp.onStateChange((state: WhatsAppState) => {
    broadcastEvent('whatsapp_state', state);
  });

  // Rotas de Status e Dashboard
  app.get('/api/status', async () => {
    return {
      whatsapp: whatsapp.state,
      configs: getAllConfigs(),
      metricas: getMetricasDashboard()
    };
  });

  // Conectar / Desconectar WhatsApp
  app.post('/api/whatsapp/connect', async (req: any) => {
    const { pairingPhone } = req.body || {};
    whatsapp.start(pairingPhone);
    return { ok: true, message: 'Iniciando conexão com WhatsApp...' };
  });

  app.post('/api/whatsapp/disconnect', async () => {
    await whatsapp.disconnect();
    return { ok: true, message: 'WhatsApp desconectado.' };
  });

  // Grupos
  app.get('/api/grupos', async () => {
    return { grupos: getAllGrupos() };
  });

  app.post('/api/grupos/sync', async () => {
    const grupos = await whatsapp.syncGrupos();
    return { ok: true, total: grupos.length, grupos };
  });

  app.post('/api/grupos/extract', async (req: any) => {
    const { groupJid } = req.body || {};
    if (!groupJid) throw new Error('groupJid é obrigatório.');

    const result = await whatsapp.extractGroupParticipants(groupJid);
    broadcastEvent('metricas', getMetricasDashboard());
    return { ok: true, ...result };
  });

  // Contatos / Leads
  app.get('/api/contatos', async (req: any) => {
    const limit = parseInt(req.query.limit || '100', 10);
    const offset = parseInt(req.query.offset || '0', 10);
    const busca = req.query.busca || '';
    return getContatos(limit, offset, busca);
  });

  app.post('/api/contatos/import', async (req: any) => {
    const { rawText, grupoNome } = req.body || {};
    if (!rawText) throw new Error('Texto de importação vazio.');

    const lines = rawText.split('\n');
    let imported = 0;

    for (const l of lines) {
      const cleanLine = l.trim();
      if (!cleanLine) continue;

      // Suporta formato "5511999999999, Nome" ou apenas "5511999999999"
      const parts = cleanLine.split(/[,;\t]/);
      let num = parts[0].replace(/\D/g, '');
      const nome = parts[1] ? parts[1].trim() : '';

      if (num.length >= 10) {
        if (!num.startsWith('55') && num.length <= 11) {
          num = '55' + num;
        }

        const jid = `${num}@s.whatsapp.net`;
        const salvo = upsertContato({
          jid,
          numero: num,
          nome,
          origem_grupo: 'manual',
          grupo_nome: grupoNome || 'Importação Manual',
          origem_tipo: 'manual'
        });
        if (salvo) imported++;
      }
    }

    logSistema('info', 'contatos', `Importados ${imported} novos contatos manualmente.`);
    broadcastEvent('metricas', getMetricasDashboard());
    return { ok: true, totalImported: imported };
  });

  app.delete('/api/contatos', async () => {
    clearContatos();
    logSistema('warn', 'contatos', 'Lista de contatos foi zerada.');
    broadcastEvent('metricas', getMetricasDashboard());
    return { ok: true };
  });

  // Campanhas
  app.get('/api/campanhas', async () => {
    return { campanhas: getCampanhas() };
  });

  app.post('/api/campanhas', async (req: any) => {
    const { nome, mensagemTemplate, targetType, targetGroupJid, mediaPath } = req.body || {};
    if (!nome || !mensagemTemplate) {
      throw new Error('Nome e Template de Mensagem são obrigatórios.');
    }

    // Selecionar destinatários
    let contatosAlvo: any[] = [];
    if (targetType === 'grupo' && targetGroupJid) {
      contatosAlvo = db.prepare('SELECT * FROM contatos WHERE ativo = 1 AND origem_grupo = ?').all(targetGroupJid) as any[];
    } else {
      contatosAlvo = db.prepare('SELECT * FROM contatos WHERE ativo = 1').all() as any[];
    }

    if (contatosAlvo.length === 0) {
      throw new Error('Nenhum contato encontrado para o público-alvo selecionado.');
    }

    const campanhaId = createCampanha({
      nome,
      mensagem_template: mensagemTemplate,
      midia_tipo: mediaPath ? 'imagem' : undefined,
      midia_path: mediaPath || undefined,
      total_destinatarios: contatosAlvo.length
    });

    // Gerar fila com mensagens personalizadas e Spintax único para cada contato
    const itensFila = contatosAlvo.map((c) => ({
      campanha_id: campanhaId,
      destinatario_jid: c.jid,
      destinatario_nome: c.nome || '',
      mensagem_gerada: renderMessageTemplate(mensagemTemplate, c),
      status: 'pendente' as const
    }));

    addItensFila(itensFila);

    logSistema('info', 'campanha', `Campanha "${nome}" criada com ${itensFila.length} destinatários.`);
    broadcastEvent('campanhas_update', {});
    return { ok: true, campanhaId, totalDestinatarios: itensFila.length };
  });

  app.post('/api/campanhas/:id/start', async (req: any) => {
    const id = parseInt(req.params.id, 10);
    updateCampanhaStatus(id, 'executando');
    dispatchEngine.start();
    broadcastEvent('campanhas_update', {});
    return { ok: true };
  });

  app.post('/api/campanhas/:id/pause', async (req: any) => {
    const id = parseInt(req.params.id, 10);
    updateCampanhaStatus(id, 'pausada');
    broadcastEvent('campanhas_update', {});
    return { ok: true };
  });

  app.post('/api/campanhas/:id/cancel', async (req: any) => {
    const id = parseInt(req.params.id, 10);
    updateCampanhaStatus(id, 'cancelada');
    broadcastEvent('campanhas_update', {});
    return { ok: true };
  });

  app.get('/api/campanhas/:id/fila', async (req: any) => {
    const id = parseInt(req.params.id, 10);
    return { fila: getFilaCampanha(id) };
  });

  // Configurações
  app.get('/api/config', async () => {
    return getAllConfigs();
  });

  app.post('/api/config', async (req: any) => {
    const updates = req.body || {};
    for (const [k, v] of Object.entries(updates)) {
      setConfig(k, String(v));
    }
    logSistema('info', 'config', 'Configurações atualizadas via painel.');
    return { ok: true, configs: getAllConfigs() };
  });

  // Testar DeepSeek
  app.post('/api/deepseek/test', async (req: any) => {
    const { prompt } = req.body || {};
    const testMsg = prompt || 'Olá! Gostaria de saber se vocês têm o fichário de 360 cartas Pokémon.';
    const reply = await generateDeepSeekResponse('teste@s.whatsapp.net', testMsg, 'Cliente Teste');
    if (!reply) {
      const logs = getLogsSistema(3);
      const errLog = logs.find((l) => l.categoria === 'deepseek' && l.nivel === 'error');
      const errDetail = errLog ? errLog.mensagem : 'Verifique a chave de API, endpoint e modelo nos logs.';
      return { ok: false, message: `Falha na IA: ${errDetail}` };
    }
    return { ok: true, pergunta: testMsg, resposta: reply };
  });

  // Logs do Sistema
  app.get('/api/logs', async (req: any) => {
    const limit = parseInt(req.query.limit || '100', 10);
    return { logs: getLogsSistema(limit) };
  });

  return app;
}
