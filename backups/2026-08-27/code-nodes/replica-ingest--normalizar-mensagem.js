// Replica WhatsApp Ingest -> node "Normalizar Mensagem" (Code, runOnceForAllItems)
// Le o webhook da Evolution API e devolve um unico item com os campos que o resto do
// fluxo usa. Nao decide nada de negocio: so traduz o payload e diz se vale seguir.

const ATRASO_MAXIMO_SEGUNDOS = 600;

function desembrulhar(m, nivel) {
  if (!m || nivel > 3) return m || {};
  if (m.ephemeralMessage && m.ephemeralMessage.message) return desembrulhar(m.ephemeralMessage.message, nivel + 1);
  if (m.viewOnceMessage && m.viewOnceMessage.message) return desembrulhar(m.viewOnceMessage.message, nivel + 1);
  if (m.viewOnceMessageV2 && m.viewOnceMessageV2.message) return desembrulhar(m.viewOnceMessageV2.message, nivel + 1);
  if (m.documentWithCaptionMessage && m.documentWithCaptionMessage.message) return desembrulhar(m.documentWithCaptionMessage.message, nivel + 1);
  return m;
}

function textoDaMensagem(m) {
  if (!m) return '';
  if (typeof m.conversation === 'string' && m.conversation.trim()) return m.conversation;
  if (m.extendedTextMessage && m.extendedTextMessage.text) return m.extendedTextMessage.text;
  if (m.imageMessage && m.imageMessage.caption) return m.imageMessage.caption;
  if (m.videoMessage && m.videoMessage.caption) return m.videoMessage.caption;
  if (m.documentMessage && m.documentMessage.caption) return m.documentMessage.caption;
  return '';
}

const entrada = $input.all()[0] || { json: {} };
const raw = entrada.json.body ? entrada.json.body : entrada.json;

const evento = String(raw.event || '').toLowerCase().replace(/\./g, '_');
const instancia = String(raw.instance || '');
const servidor = String(raw.server_url || '').replace(/\/+$/, '');

const dados = raw.data || {};
const chave = dados.key || {};
const chatId = String(chave.remoteJid || '');
const mensagemId = String(chave.id || '');
const daPropriaConta = chave.fromMe === true;
const participante = String(chave.participant || dados.participant || '');

const mensagem = desembrulhar(dados.message || {}, 0);
const texto = textoDaMensagem(mensagem);

const imagem = mensagem.imageMessage || null;
const temImagem = !!imagem;
const mimetype = imagem ? String(imagem.mimetype || 'image/jpeg') : '';

const agoraSegundos = Math.floor(Date.now() / 1000);
const carimbo = Number(dados.messageTimestamp || 0);
const atraso = carimbo > 0 ? agoraSegundos - carimbo : 0;

let ignorar = '';
if (evento && evento !== 'messages_upsert') ignorar = 'evento_fora_de_escopo';
else if (!chatId.endsWith('@g.us')) ignorar = 'nao_e_grupo';
else if (daPropriaConta) ignorar = 'mensagem_da_propria_conta';
else if (!texto.trim()) ignorar = 'sem_texto';
else if (atraso > ATRASO_MAXIMO_SEGUNDOS) ignorar = 'mensagem_atrasada';

return [{
  json: {
    evento: evento,
    instancia: instancia,
    servidor: servidor,
    chat_id: chatId,
    mensagem_id: mensagemId,
    participante: participante,
    push_name: String(dados.pushName || ''),
    texto: texto,
    tem_imagem: temImagem,
    mimetype: mimetype,
    atraso_segundos: atraso,
    ignorar: ignorar,
    seguir: ignorar === '',
  },
}];
