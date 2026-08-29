// Replica Nomes Sync -> node "Extrair Subject"
// Aceita findGroupInfos (subject no topo ou em group.subject).
function chatIdDe(raw, fallback) {
  return String(
    (raw && (raw.id || raw.jid || raw.remoteJid || raw.groupJid || (raw.group && raw.group.id))) || fallback || ''
  ).trim();
}

function nomeDe(raw) {
  const g = raw && raw.group ? raw.group : raw;
  const candidatos = [
    g && g.subject,
    g && g.name,
    g && g.nome,
    g && g.subjectName,
    raw && raw.subject,
    raw && raw.name
  ];
  for (let i = 0; i < candidatos.length; i++) {
    const n = String(candidatos[i] || '').trim();
    if (!n) continue;
    if (n.indexOf('@g.us') !== -1) continue;
    return n.slice(0, 80);
  }
  return '';
}

const listados = $('Listar Grupos Sem Nome').all();
const respostas = $input.all();
const vistos = {};
const nomes = [];

for (let i = 0; i < respostas.length; i++) {
  const raw = (respostas[i] && respostas[i].json) || {};
  const fallback = listados[i] && listados[i].json ? listados[i].json.chat_id : '';
  const chatId = chatIdDe(raw, fallback);
  const nome = nomeDe(raw);
  if (!chatId || chatId.indexOf('@g.us') === -1) continue;
  if (!nome || vistos[chatId]) continue;
  vistos[chatId] = true;
  nomes.push({ chat_id: chatId, nome: nome });
}

if (!nomes.length) return [];
const nomesJson = JSON.stringify(nomes);
return [{
  json: {
    nomes: nomes,
    nomes_json: nomesJson,
    nomes_b64: Buffer.from(nomesJson).toString('base64'),
    nomes_ok: nomes.length
  }
}];
