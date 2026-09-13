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
  getPastasLeads,
  getAllContatosParaExportar,
  deletePastaLeads,
  deleteContato,
  upsertContato,
  clearContatos,
  getAllGrupos,
  getCampanhas,
  createCampanha,
  updateCampanhaStatus,
  deleteCampanha,
  getFilaCampanha,
  addItensFila,
  getLogsSistema,
  getMetricasDashboard,
  getWarmupStatus,
  resetWarmupStartDate,
  logSistema,
  db
} from '../db/database.js';
import { whatsapp, WhatsAppState } from '../whatsapp/client.js';
import { dispatchEngine } from '../core/engine.js';
import { renderMessageTemplate } from '../core/spintax.js';
import { generateDeepSeekResponse } from '../ai/deepseek.js';
import {
  verifyCredentials,
  createSessionToken,
  verifySessionToken,
  extractSessionToken,
  buildSessionCookie,
  buildClearCookie
} from './auth.js';

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

  // Hook de Autenticação Global
  app.addHook('onRequest', async (req, reply) => {
    const url = req.raw.url || '';
    const pathname = url.split('?')[0];

    // Rotas públicas que não requerem autenticação
    if (
      pathname === '/health' ||
      pathname === '/api/status' ||
      pathname === '/api/auth/login' ||
      pathname === '/login.html' ||
      pathname === '/favicon.svg'
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

  // Healthcheck endpoint (para Railway monitor)
  app.get('/health', async () => {
    return { status: 'ok', time: new Date().toISOString() };
  });

  // Endpoints de Autenticação
  app.post('/api/auth/login', async (req, reply) => {
    const { username, password } = (req.body as any) || {};
    if (!verifyCredentials(username, password)) {
      return reply.status(401).send({ ok: false, error: 'Usuário ou senha incorretos' });
    }

    const token = createSessionToken(username);
    reply.header('Set-Cookie', buildSessionCookie(token));
    return { ok: true, message: 'Login realizado com sucesso' };
  });

  app.post('/api/auth/logout', async (req, reply) => {
    reply.header('Set-Cookie', buildClearCookie());
    return { ok: true, message: 'Logout realizado com sucesso' };
  });

  app.get('/api/auth/me', async (req, reply) => {
    const token = extractSessionToken(req);
    const auth = verifySessionToken(token);
    return { ok: auth.valid, username: auth.username };
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

  // Contatos / Leads & Pastas
  app.get('/api/contatos/pastas', async () => {
    return { pastas: getPastasLeads() };
  });

  app.get('/api/contatos', async (req: any) => {
    const limit = parseInt(req.query.limit || '100', 10);
    const offset = parseInt(req.query.offset || '0', 10);
    const busca = req.query.busca || '';
    const pasta = req.query.pasta || '';
    return getContatos(limit, offset, busca, pasta);
  });

  app.get('/api/contatos/export', async (req: any, reply) => {
    const pasta = req.query.pasta || '';
    const formato = (req.query.formato || 'excel').toLowerCase();
    const contatos = getAllContatosParaExportar(pasta);

    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
    const sanitizedName = pasta ? pasta.replace(/[^a-zA-Z0-9_-]/g, '_') : 'todos';

    // Formato Otimizado para Meta Ads (Facebook & Instagram Custom Audiences)
    if (formato === 'meta' || formato === 'facebook') {
      // Cabeçalhos que o Gerenciador de Anúncios do Meta reconhece 100% automático
      let csv = 'phone,fn,ln,country\r\n';
      for (const c of contatos) {
        let phoneDigits = (c.numero || '').replace(/\D/g, '');
        // Adiciona DDI 55 (Brasil) se vier com DDD + número sem 55
        if (phoneDigits.length === 10 || phoneDigits.length === 11) {
          phoneDigits = `55${phoneDigits}`;
        }
        if (!phoneDigits) continue;

        // Separa primeiro nome (fn) e sobrenome (ln) para maximizar o Match Rate do Meta
        const nomeCompleto = (c.nome || '').trim();
        let fn = '';
        let ln = '';
        if (nomeCompleto) {
          const partes = nomeCompleto.split(/\s+/);
          fn = partes[0] || '';
          ln = partes.slice(1).join(' ') || '';
        }

        csv += `${escapeCsv(phoneDigits)},${escapeCsv(fn)},${escapeCsv(ln)},"BR"\r\n`;
      }

      const filename = `meta_ads_leads_${sanitizedName}_${new Date().toISOString().split('T')[0]}.csv`;
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return reply.send(csv);
    }

    // Formato Padrão Microsoft Excel (delimitador ponto e vírgula, com UTF-8 BOM)
    let csv = '\uFEFFNúmero;Nome;Pasta / Grupo;Tipo de Origem;Data de Cadastro;Status\r\n';
    for (const c of contatos) {
      const num = c.numero.startsWith('+') ? c.numero : `+${c.numero}`;
      csv += [
        escapeCsv(num),
        escapeCsv(c.nome || ''),
        escapeCsv(c.grupo_nome || 'Geral'),
        escapeCsv(c.origem_tipo || 'extracao'),
        escapeCsv(c.criado_em || ''),
        escapeCsv(c.ativo ? 'Ativo' : 'Inativo')
      ].join(';') + '\r\n';
    }

    const filename = `leads_pokemon_${sanitizedName}_${new Date().toISOString().split('T')[0]}.csv`;
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send(csv);
  });

  app.delete('/api/contatos/pasta', async (req: any) => {
    const { pastaNome } = req.body || {};
    if (!pastaNome) throw new Error('pastaNome é obrigatório.');
    const deleted = deletePastaLeads(pastaNome);
    logSistema('warn', 'contatos', `Pasta "${pastaNome}" e seus ${deleted} contatos foram excluídos.`);
    broadcastEvent('metricas', getMetricasDashboard());
    return { ok: true, totalDeleted: deleted };
  });

  app.post('/api/contatos/import', async (req: any) => {
    const { rawText, pastaNome, grupoNome } = req.body || {};
    if (!rawText) throw new Error('Texto de importação vazio.');

    const pastaFinal = (pastaNome || grupoNome || 'Importação Manual').trim();
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
          grupo_nome: pastaFinal,
          origem_tipo: 'manual'
        });
        if (salvo) imported++;
      }
    }

    logSistema('info', 'contatos', `Importados ${imported} novos contatos na pasta "${pastaFinal}".`);
    broadcastEvent('metricas', getMetricasDashboard());
    return { ok: true, totalImported: imported, pasta: pastaFinal };
  });

  app.delete('/api/contatos', async () => {
    clearContatos();
    logSistema('warn', 'contatos', 'Lista de contatos foi zerada.');
    broadcastEvent('metricas', getMetricasDashboard());
    return { ok: true };
  });

  app.delete('/api/contatos/:id', async (req: any) => {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) throw new Error('ID inválido.');
    deleteContato(id);
    broadcastEvent('metricas', getMetricasDashboard());
    return { ok: true };
  });

  // Campanhas
  app.get('/api/campanhas', async () => {
    return { campanhas: getCampanhas() };
  });

  app.post('/api/campanhas', async (req: any) => {
    const { nome, mensagemTemplate, targetType, targetGroupJid, targetPastaNome, mediaPath } = req.body || {};
    if (!nome || !mensagemTemplate) {
      throw new Error('Nome e Template de Mensagem são obrigatórios.');
    }

    // Selecionar destinatários
    let contatosAlvo: any[] = [];
    if (targetType === 'grupo' && targetGroupJid) {
      contatosAlvo = db.prepare('SELECT * FROM contatos WHERE ativo = 1 AND origem_grupo = ?').all(targetGroupJid) as any[];
    } else if (targetType === 'pasta' && targetPastaNome) {
      if (targetPastaNome === 'Geral') {
        contatosAlvo = db.prepare("SELECT * FROM contatos WHERE ativo = 1 AND (grupo_nome IS NULL OR TRIM(grupo_nome) = '' OR grupo_nome = 'Geral')").all() as any[];
      } else {
        contatosAlvo = db.prepare('SELECT * FROM contatos WHERE ativo = 1 AND grupo_nome = ?').all(targetPastaNome) as any[];
      }
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
    dispatchEngine.start(true); // Forçar retomada imediata de qualquer pausa
    broadcastEvent('campanhas_update', {});
    return { ok: true };
  });

  app.post('/api/campanhas/:id/pause', async (req: any) => {
    const id = parseInt(req.params.id, 10);
    updateCampanhaStatus(id, 'pausada');
    broadcastEvent('campanhas_update', {});
    return { ok: true };
  });

  app.post('/api/engine/resume', async () => {
    dispatchEngine.resumeNow();
    broadcastEvent('campanhas_update', {});
    return { ok: true, status: dispatchEngine.getStatus() };
  });

  app.get('/api/engine/status', async () => {
    return dispatchEngine.getStatus();
  });

  app.post('/api/whatsapp/test-send', async (req: any) => {
    const { phone, text } = req.body || {};
    if (!phone) throw new Error('Número de telefone é obrigatório.');

    const targetPhone = phone.replace(/\D/g, '');
    const cleanJid = targetPhone.startsWith('55') ? `${targetPhone}@s.whatsapp.net` : `55${targetPhone}@s.whatsapp.net`;
    const msgText = text || '⚡ Teste de conexão do Disparador Pro! Se você recebeu esta mensagem, o envio direto está funcionando perfeitamente.';

    await whatsapp.sendDirectMessage(cleanJid, msgText);
    logSistema('disparo', 'disparo', `[TESTE MANUAL] Mensagem de teste enviada com sucesso para ${cleanJid.split('@')[0]}`);
    return { ok: true, destinatario: cleanJid };
  });

  app.post('/api/campanhas/:id/cancel', async (req: any) => {
    const id = parseInt(req.params.id, 10);
    updateCampanhaStatus(id, 'cancelada');
    broadcastEvent('campanhas_update', {});
    return { ok: true };
  });

  app.delete('/api/campanhas/:id', async (req: any) => {
    const id = parseInt(req.params.id, 10);
    deleteCampanha(id);
    logSistema('warn', 'campanha', `Campanha #${id} e seus envios pendentes foram excluídos.`);
    broadcastEvent('campanhas_update', {});
    broadcastEvent('metricas', getMetricasDashboard());
    return { ok: true };
  });

  app.get('/api/campanhas/:id/fila', async (req: any) => {
    const id = parseInt(req.params.id, 10);
    const limit = parseInt(req.query.limit || '1000', 10);
    return { fila: getFilaCampanha(id, limit) };
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
    broadcastEvent('metricas', getMetricasDashboard());
    return { ok: true, configs: getAllConfigs(), warmup: getWarmupStatus() };
  });

  // Aquecimento de Chip
  app.get('/api/warmup', async () => {
    return { warmup: getWarmupStatus() };
  });

  app.post('/api/warmup/reset', async () => {
    resetWarmupStartDate();
    logSistema('info', 'aquecimento', 'Data de início do aquecimento reiniciada para hoje.');
    broadcastEvent('metricas', getMetricasDashboard());
    return { ok: true, warmup: getWarmupStatus() };
  });

  // Testar DeepSeek / OpenCode
  app.post('/api/deepseek/test', async (req: any) => {
    const { prompt, apiKey, baseUrl, model, promptSistema } = req.body || {};
    if (apiKey) setConfig('deepseek_api_key', apiKey.trim());
    if (baseUrl) setConfig('deepseek_base_url', baseUrl.trim());
    if (model) setConfig('deepseek_model', model.trim());
    if (promptSistema) setConfig('deepseek_prompt_sistema', promptSistema.trim());

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
