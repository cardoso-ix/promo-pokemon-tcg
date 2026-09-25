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
  getMetaTemplates,
  getMetaTemplateByNome,
  saveMetaTemplate,
  deleteMetaTemplateFromDb,
  salvarOfertaRecebida,
  getOfertasRecebidas,
  marcarOfertaStatus,
  deleteOfertaRecebida,
  listarFinancasUploads,
  getFinancasUploadById,
  listarMesesDisponiveisFinancas,
  getDespesaPdfById,
  obterResumoDespesasPeriodo,
  db
} from '../db/database.js';
import {
  arquivarPlanilhaSemanal,
  removerUploadArquivado,
  gerarRelatorioExecutivo,
  exportarRelatorioCsv,
  extrairDadosPdfFatura,
  arquivarDespesaPdf,
  removerDespesaPdf,
  exportarRelatorioPeriodoCsv
} from '../core/financas.js';
import { whatsapp, WhatsAppState } from '../whatsapp/client.js';
import { dispatchEngine } from '../core/engine.js';
import { renderMessageTemplate } from '../core/spintax.js';
import { generateDeepSeekResponse, optimizeTemplateWithDeepSeek } from '../ai/deepseek.js';
import { validateMetaTemplate } from '../core/meta-validator.js';
import {
  testMetaConnection,
  submitMetaTemplate,
  syncMetaTemplates,
  deleteMetaTemplate,
  optimizeTemplateForUtility,
  validateUtilitySafety,
  PRESET_UTILITY_TEMPLATES
} from '../core/meta-cloud.js';
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

    // Rotas internas entre serviços (protegidas por token X-Internal-Token)
    if (pathname.startsWith('/api/internal/')) {
      const internalToken = req.headers['x-internal-token'];
      const expectedToken = process.env.INTERNAL_API_KEY || getConfig('internal_api_key', 'promo-internal-key-2026');
      if (!internalToken || internalToken !== expectedToken) {
        return reply.status(401).send({ ok: false, error: 'Acesso interno não autorizado. Token inválido.' });
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

  // Endpoints de Validação e Otimização de Templates Meta Shield
  app.post('/api/templates/validate', async (req: any) => {
    const { template, isColdContact } = req.body || {};
    const result = validateMetaTemplate(template || '', {
      isColdContact: isColdContact !== false
    });
    return result;
  });

  app.post('/api/templates/optimize-ai', async (req: any, reply) => {
    const { template } = req.body || {};
    if (!template || !template.trim()) {
      return reply.status(400).send({ ok: false, error: 'Digite ou cole uma mensagem para otimizar.' });
    }

    try {
      const optimizedTemplate = await optimizeTemplateWithDeepSeek(template);
      const validation = validateMetaTemplate(optimizedTemplate, { isColdContact: true });
      return { ok: true, optimizedTemplate, validation };
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: err?.message || 'Falha ao otimizar template.' });
    }
  });

  // --- ENDPOINTS META BUSINESS CLOUD API (OFICIAL) ---

  // Status e Configurações da Meta Cloud
  app.get('/api/meta/status', async () => {
    const ativo = getConfig('meta_cloud_ativo', 'false') === 'true';
    const token = getConfig('meta_cloud_token', '');
    const wabaId = getConfig('meta_waba_id', '');
    const phoneNumberId = getConfig('meta_phone_number_id', '');
    const apiVersion = getConfig('meta_api_version', 'v21.0');

    const templates = getMetaTemplates();
    const aprovados = templates.filter((t) => t.status === 'APPROVED').length;
    const pendentes = templates.filter((t) => t.status === 'PENDING').length;
    const rejeitados = templates.filter((t) => t.status === 'REJECTED').length;

    return {
      ativo,
      configured: Boolean(token && phoneNumberId && wabaId),
      wabaId,
      phoneNumberId,
      apiVersion,
      hasToken: Boolean(token),
      templatesCount: {
        total: templates.length,
        aprovados,
        pendentes,
        rejeitados
      }
    };
  });

  app.post('/api/meta/config', async (req: any) => {
    const { ativo, token, wabaId, phoneNumberId, apiVersion } = req.body || {};
    if (ativo !== undefined) setConfig('meta_cloud_ativo', String(ativo));
    if (token !== undefined) setConfig('meta_cloud_token', String(token).trim());
    if (wabaId !== undefined) setConfig('meta_waba_id', String(wabaId).trim());
    if (phoneNumberId !== undefined) setConfig('meta_phone_number_id', String(phoneNumberId).trim());
    if (apiVersion !== undefined) setConfig('meta_api_version', String(apiVersion).trim() || 'v21.0');

    logSistema('info', 'config', 'Configurações da Meta Cloud API atualizadas.');
    return { ok: true };
  });

  app.post('/api/meta/test-connection', async (req: any, reply) => {
    const { token, phoneNumberId, apiVersion } = req.body || {};
    const finalToken = token || getConfig('meta_cloud_token', '');
    const finalPhoneId = phoneNumberId || getConfig('meta_phone_number_id', '');
    const finalVersion = apiVersion || getConfig('meta_api_version', 'v21.0');

    const result = await testMetaConnection(finalToken, finalPhoneId, finalVersion);
    if (!result.ok) {
      return reply.status(400).send(result);
    }
    return result;
  });

  // Templates Oficiais
  app.get('/api/meta/templates', async () => {
    const templates = getMetaTemplates();
    return {
      templates,
      presets: PRESET_UTILITY_TEMPLATES
    };
  });

  app.post('/api/meta/templates/sync', async (req: any, reply) => {
    const token = getConfig('meta_cloud_token', '');
    const wabaId = getConfig('meta_waba_id', '');
    const apiVersion = getConfig('meta_api_version', 'v21.0');

    if (!token || !wabaId) {
      return reply.status(400).send({ ok: false, error: 'Configure o Token e o WABA ID da Meta antes de sincronizar.' });
    }

    const result = await syncMetaTemplates(token, wabaId, apiVersion);
    if (!result.ok) {
      return reply.status(500).send(result);
    }

    const templates = getMetaTemplates();
    return { ok: true, totalSincronizados: result.totalSincronizados, templates };
  });

  app.post('/api/meta/templates', async (req: any, reply) => {
    const { name, category, bodyText, exampleVariables } = req.body || {};

    if (!name || !bodyText) {
      return reply.status(400).send({ ok: false, error: 'Nome e Corpo do texto do template são obrigatórios.' });
    }

    const token = getConfig('meta_cloud_token', '');
    const wabaId = getConfig('meta_waba_id', '');
    const apiVersion = getConfig('meta_api_version', 'v21.0');

    if (!token || !wabaId) {
      return reply.status(400).send({ ok: false, error: 'Configure o Token e o WABA ID nas configurações da Meta.' });
    }

    const finalCategory = (category === 'MARKETING' ? 'MARKETING' : 'UTILITY') as 'UTILITY' | 'MARKETING';
    const utilityAudit = validateUtilitySafety(bodyText);

    const result = await submitMetaTemplate({
      token,
      wabaId,
      name,
      category: finalCategory,
      bodyText,
      exampleVariables
    }, apiVersion);

    if (!result.ok) {
      return reply.status(400).send({
        ok: false,
        error: result.error,
        utilityAudit
      });
    }

    logSistema('info', 'meta_cloud', `Template "${name}" submetido com sucesso para a Meta (${finalCategory}).`);
    return { ok: true, templateId: result.templateId, status: result.status, utilityAudit };
  });

  app.delete('/api/meta/templates/:name', async (req: any, reply) => {
    const { name } = req.params;
    const token = getConfig('meta_cloud_token', '');
    const wabaId = getConfig('meta_waba_id', '');
    const apiVersion = getConfig('meta_api_version', 'v21.0');

    const result = await deleteMetaTemplate(token, wabaId, name, apiVersion);
    if (!result.ok) {
      return reply.status(400).send(result);
    }

    logSistema('info', 'meta_cloud', `Template "${name}" excluído da Meta e do banco local.`);
    return { ok: true };
  });

  app.post('/api/meta/templates/optimize-utility', async (req: any, reply) => {
    const { text } = req.body || {};
    if (!text || !text.trim()) {
      return reply.status(400).send({ ok: false, error: 'Informe um texto para otimizar.' });
    }

    const deepseekKey = getConfig('deepseek_api_key', '');
    const deepseekBaseUrl = getConfig('deepseek_base_url', 'https://opencode.ai/zen/go/v1');
    const deepseekModel = getConfig('deepseek_model', 'deepseek-v4-flash');

    const optimized = await optimizeTemplateForUtility(text, deepseekKey, deepseekBaseUrl, deepseekModel);
    const safety = validateUtilitySafety(optimized);

    return {
      ok: true,
      originalText: text,
      optimizedText: optimized,
      safety
    };
  });

  app.post('/api/campanhas', async (req: any, reply) => {
    const {
      nome,
      mensagemTemplate,
      targetType,
      targetGroupJid,
      targetPastaNome,
      mediaPath,
      forceRiskApproval,
      canalEnvio,
      metaTemplateNome
    } = req.body || {};

    if (!nome || !mensagemTemplate) {
      return reply.status(400).send({ ok: false, error: 'Nome e Template de Mensagem são obrigatórios.' });
    }

    const canalFinal = canalEnvio === 'meta_cloud' ? 'meta_cloud' : 'baileys';

    if (canalFinal === 'meta_cloud') {
      const metaToken = getConfig('meta_cloud_token', '');
      const metaPhoneId = getConfig('meta_phone_number_id', '');
      if (!metaToken || !metaPhoneId) {
        return reply.status(400).send({
          ok: false,
          error: 'Credenciais da Meta Cloud API não configuradas. Acesse a aba Meta Cloud para cadastrar Token e ID do Número.'
        });
      }
      if (!metaTemplateNome) {
        return reply.status(400).send({
          ok: false,
          error: 'Para envios via WhatsApp Oficial (Meta Cloud), é obrigatório selecionar um Template Homologado na Meta.'
        });
      }
    } else {
      // Auditoria Meta Shield antes do disparo no chip tradicional
      const metaValidation = validateMetaTemplate(mensagemTemplate, { isColdContact: true });
      if (metaValidation.nivelRisco === 'alto_risco' && !forceRiskApproval) {
        return reply.status(400).send({
          ok: false,
          error: 'Template com Alto Risco de Banimento detectado pelo Meta Shield. Corrija os gatilhos de risco ou confirme o envio forçado.',
          metaValidation
        });
      }
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
      return reply.status(400).send({ ok: false, error: 'Nenhum contato encontrado para o público-alvo selecionado.' });
    }

    const campanhaId = createCampanha({
      nome,
      mensagem_template: mensagemTemplate,
      midia_tipo: mediaPath ? 'imagem' : undefined,
      midia_path: mediaPath || undefined,
      total_destinatarios: contatosAlvo.length,
      canal_envio: canalFinal,
      meta_template_nome: metaTemplateNome || undefined
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

    logSistema('info', 'campanha', `Campanha "${nome}" criada via ${canalFinal === 'meta_cloud' ? 'Meta Cloud (Oficial)' : 'Chip Baileys'} com ${itensFila.length} destinatários.`);
    broadcastEvent('campanhas_update', {});
    return { ok: true, campanhaId, totalDestinatarios: itensFila.length, canalEnvio: canalFinal };
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

  // ==========================================
  // PONTE INTERNA COM REPLICADOR DE OFERTAS
  // ==========================================
  app.post('/api/internal/oferta', async (req: any, reply) => {
    const oferta = req.body;
    if (!oferta || !oferta.titulo || !oferta.linkAfiliado) {
      return reply.status(400).send({ ok: false, error: 'Campos titulo e linkAfiliado são obrigatórios.' });
    }

    const id = salvarOfertaRecebida(oferta);
    logSistema('info', 'ponte_interna', `Oferta de Pokémon TCG sincronizada via rede interna: "${oferta.titulo}" (ID: ${id})`);
    broadcastEvent('nova_oferta', { id, ...oferta });

    return { ok: true, id, message: 'Oferta registrada com sucesso no disparador.' };
  });

  app.get('/api/ofertas-recebidas', async (req: any) => {
    const limit = parseInt(req.query.limit || '50', 10);
    const status = req.query.status || undefined;
    return { ok: true, ofertas: getOfertasRecebidas(limit, status) };
  });

  app.patch('/api/ofertas-recebidas/:id/status', async (req: any) => {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body || {};
    if (!status) throw new Error('Status é obrigatório.');
    marcarOfertaStatus(id, status);
    return { ok: true, id, status };
  });

  app.delete('/api/ofertas-recebidas/:id', async (req: any) => {
    const id = parseInt(req.params.id, 10);
    deleteOfertaRecebida(id);
    return { ok: true, id };
  });

  // ==========================================
  // MÓDULO DE FINANÇAS & CONTROLE META ADS
  // ==========================================

  // Upload semanal de planilha Excel (XLSX, XLS, CSV)
  app.post('/api/financas/upload', async (req: any, reply) => {
    try {
      const part = await req.file();
      if (!part) {
        return reply.status(400).send({ ok: false, error: 'Nenhum arquivo enviado.' });
      }

      const buffer = await part.toBuffer();
      if (!buffer || buffer.length === 0) {
        return reply.status(400).send({ ok: false, error: 'O arquivo enviado está vazio.' });
      }

      const fields: any = part.fields || {};
      const semanaRotulo = (fields.semanaRotulo?.value || req.query.semanaRotulo || '').trim();
      const mesReferencia = (fields.mesReferencia?.value || req.query.mesReferencia || '').trim();

      const resultado = await arquivarPlanilhaSemanal(
        buffer,
        part.filename,
        semanaRotulo || undefined,
        mesReferencia || undefined
      );

      logSistema(
        'info',
        'financas',
        `Planilha de Meta Ads arquivada: "${part.filename}" (${resultado.resumo.semanaRotulo}, Mês ${resultado.resumo.mesReferencia}, R$ ${resultado.resumo.gastoTotal})`
      );

      return {
        ok: true,
        message: 'Planilha processada e arquivada com sucesso.',
        uploadId: resultado.uploadId,
        resumo: resultado.resumo
      };
    } catch (err: any) {
      logSistema('error', 'financas', `Erro ao processar planilha: ${err.message}`);
      return reply.status(400).send({ ok: false, error: err.message || 'Erro ao processar planilha.' });
    }
  });

  // Listar histórico de uploads arquivados
  app.get('/api/financas/uploads', async (req: any) => {
    const mes = (req.query.mes || '').trim();
    const uploads = listarFinancasUploads(mes || undefined);
    return { ok: true, uploads };
  });

  // Listar meses disponíveis com dados
  app.get('/api/financas/meses', async () => {
    const meses = listarMesesDisponiveisFinancas();
    return { ok: true, meses };
  });

  // Obter relatório mensal consolidado
  app.get('/api/financas/relatorio', async (req: any) => {
    let mes = (req.query.mes || '').trim();
    if (!mes) {
      const mesesDisponiveis = listarMesesDisponiveisFinancas();
      if (mesesDisponiveis.length > 0) {
        mes = mesesDisponiveis[0];
      } else {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const m = String(hoje.getMonth() + 1).padStart(2, '0');
        mes = `${ano}-${m}`;
      }
    }

    const relatorio = gerarRelatorioExecutivo(mes);
    return { ok: true, relatorio };
  });

  // Exportar relatório consolidado do mês em CSV
  app.get('/api/financas/exportar-csv', async (req: any, reply) => {
    let mes = (req.query.mes || '').trim();
    if (!mes) {
      const mesesDisponiveis = listarMesesDisponiveisFinancas();
      mes = mesesDisponiveis[0] || new Date().toISOString().substring(0, 7);
    }

    const csvContent = exportarRelatorioCsv(mes);
    // Prefixo BOM UTF-8 (\uFEFF) para garantir acentuação perfeita no Microsoft Excel brasileiro
    const csvComBom = '\uFEFF' + csvContent;

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="relatorio_meta_ads_${mes}.csv"`);
    return reply.send(csvComBom);
  });

  // Download do arquivo de planilha original arquivado
  app.get('/api/financas/download/:id', async (req: any, reply) => {
    const id = parseInt(req.params.id, 10);
    const upload = getFinancasUploadById(id);

    if (!upload || !upload.caminho_arquivo || !fs.existsSync(upload.caminho_arquivo)) {
      return reply.status(404).send({ ok: false, error: 'Arquivo original não encontrado.' });
    }

    const stream = fs.createReadStream(upload.caminho_arquivo);
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(upload.nome_arquivo)}"`);
    return reply.send(stream);
  });

  // Excluir upload arquivado e suas métricas
  app.delete('/api/financas/upload/:id', async (req: any, reply) => {
    const id = parseInt(req.params.id, 10);
    const sucesso = removerUploadArquivado(id);
    if (!sucesso) {
      return reply.status(404).send({ ok: false, error: 'Registro não encontrado.' });
    }

    logSistema('warn', 'financas', `Planilha arquivada ID ${id} removida pelo usuário.`);
    return { ok: true, id, message: 'Upload removido com sucesso.' };
  });

  // ==========================================
  // FATURAS & DESPESAS EM PDF (META ADS)
  // ==========================================

  // Analisar PDF para extrair automaticamente data, valor e dados do recibo
  app.post('/api/financas/despesas/analisar-pdf', async (req: any, reply) => {
    try {
      const part = await req.file();
      if (!part) {
        return reply.status(400).send({ ok: false, error: 'Nenhum arquivo enviado.' });
      }

      const buffer = await part.toBuffer();
      if (!buffer || buffer.length === 0) {
        return reply.status(400).send({ ok: false, error: 'O arquivo enviado está vazio.' });
      }

      const extraido = await extrairDadosPdfFatura(buffer, part.filename);
      return {
        ok: true,
        nomeArquivo: part.filename,
        tamanhoBytes: buffer.length,
        sugestao: extraido
      };
    } catch (err: any) {
      logSistema('error', 'financas', `Erro ao analisar fatura PDF: ${err.message}`);
      return reply.status(400).send({ ok: false, error: err.message || 'Erro ao analisar fatura PDF.' });
    }
  });

  // Upload e cadastro de fatura PDF (com extração inteligente e suporte a campos confirmados)
  app.post('/api/financas/despesas/upload', async (req: any, reply) => {
    try {
      const part = await req.file();
      if (!part) {
        return reply.status(400).send({ ok: false, error: 'Nenhum arquivo enviado.' });
      }

      const buffer = await part.toBuffer();
      if (!buffer || buffer.length === 0) {
        return reply.status(400).send({ ok: false, error: 'O arquivo enviado está vazio.' });
      }

      const fields: any = part.fields || {};
      const dataDespesa = (fields.dataDespesa?.value || req.query.dataDespesa || '').trim();
      const valorStr = (fields.valor?.value || req.query.valor || '').trim();
      const valor = valorStr ? parseFloat(valorStr) : undefined;
      const descricao = (fields.descricao?.value || req.query.descricao || '').trim();
      const contaAnuncio = (fields.contaAnuncio?.value || req.query.contaAnuncio || '').trim();
      const metodoPagamento = (fields.metodoPagamento?.value || req.query.metodoPagamento || '').trim();
      const observacoes = (fields.observacoes?.value || req.query.observacoes || '').trim();

      const resultado = await arquivarDespesaPdf(buffer, part.filename, {
        dataDespesa: dataDespesa || undefined,
        valor: valor !== undefined && !isNaN(valor) ? valor : undefined,
        descricao: descricao || undefined,
        contaAnuncio: contaAnuncio || undefined,
        metodoPagamento: metodoPagamento || undefined,
        observacoes: observacoes || undefined
      });

      logSistema(
        'info',
        'financas',
        `Fatura PDF arquivada com sucesso: "${resultado.despesa.nome_arquivo}" (Data: ${resultado.despesa.data_despesa}, R$ ${resultado.despesa.valor})`
      );

      return {
        ok: true,
        message: 'Fatura cadastrada e arquivada com sucesso.',
        despesaId: resultado.despesaId,
        despesa: resultado.despesa
      };
    } catch (err: any) {
      logSistema('error', 'financas', `Erro ao arquivar fatura PDF: ${err.message}`);
      return reply.status(400).send({ ok: false, error: err.message || 'Erro ao arquivar fatura PDF.' });
    }
  });

  // Consultar despesas e resumo por intervalo de calendário (data início e data fim)
  app.get('/api/financas/despesas', async (req: any) => {
    const inicio = (req.query.inicio || '').trim();
    const fim = (req.query.fim || '').trim();

    const resumo = obterResumoDespesasPeriodo(inicio || undefined, fim || undefined);
    return { ok: true, resumo };
  });

  // Visualizar PDF no navegador (inline)
  app.get('/api/financas/despesas/pdf/:id', async (req: any, reply) => {
    const id = parseInt(req.params.id, 10);
    const despesa = getDespesaPdfById(id);

    if (!despesa || !despesa.caminho_arquivo || !fs.existsSync(despesa.caminho_arquivo)) {
      return reply.status(404).send({ ok: false, error: 'Arquivo PDF não encontrado no servidor.' });
    }

    const stream = fs.createReadStream(despesa.caminho_arquivo);
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(despesa.nome_arquivo)}"`);
    return reply.send(stream);
  });

  // Download do arquivo PDF original
  app.get('/api/financas/despesas/download/:id', async (req: any, reply) => {
    const id = parseInt(req.params.id, 10);
    const despesa = getDespesaPdfById(id);

    if (!despesa || !despesa.caminho_arquivo || !fs.existsSync(despesa.caminho_arquivo)) {
      return reply.status(404).send({ ok: false, error: 'Arquivo PDF não encontrado.' });
    }

    const stream = fs.createReadStream(despesa.caminho_arquivo);
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(despesa.nome_arquivo)}"`);
    return reply.send(stream);
  });

  // Excluir registro de despesa e o arquivo PDF físico correspondente
  app.delete('/api/financas/despesas/:id', async (req: any, reply) => {
    const id = parseInt(req.params.id, 10);
    const despesa = getDespesaPdfById(id);
    if (!despesa) {
      return reply.status(404).send({ ok: false, error: 'Despesa não encontrada.' });
    }

    const sucesso = removerDespesaPdf(id);
    if (!sucesso) {
      return reply.status(500).send({ ok: false, error: 'Erro ao remover arquivo físico.' });
    }

    logSistema('warn', 'financas', `Despesa ID ${id} ("${despesa.descricao}", R$ ${despesa.valor}) removida pelo usuário.`);
    return { ok: true, id, message: 'Despesa e fatura PDF removidas com sucesso.' };
  });

  // Exportar relatório em CSV do período selecionado
  app.get('/api/financas/despesas/exportar-csv', async (req: any, reply) => {
    const inicio = (req.query.inicio || '').trim();
    const fim = (req.query.fim || '').trim();

    const csvContent = exportarRelatorioPeriodoCsv(inicio || undefined, fim || undefined);
    const csvComBom = '\uFEFF' + csvContent;

    const sufixo = inicio && fim ? `${inicio}_a_${fim}` : 'geral';
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="despesas_meta_ads_${sufixo}.csv"`);
    return reply.send(csvComBom);
  });

  return app;
}
