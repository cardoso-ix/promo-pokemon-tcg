// Replica Painel -> node "Normalizar Grupos da Evolution"
// Aceita fetchAllGroups (subject) e findChats (name / remoteJid).
// Daqui sai sempre [{chat_id, nome}]. Se a busca falhar, sai lista vazia.

function listaDe(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.groups)) return raw.groups;
  if (Array.isArray(raw.chats)) return raw.chats;
  if (Array.isArray(raw.response)) return raw.response;
  if (raw.error) return [];
  if (raw.id || raw.jid || raw.remoteJid || raw.groupJid) return [raw];
  return [];
}

function chatIdDe(g) {
  return String(
    g.id || g.jid || g.remoteJid || g.groupJid || g.chat_id || ''
  ).trim();
}

function nomeDe(g, chatId) {
  const candidatos = [g.subject, g.name, g.nome, g.pushName, g.subjectName];
  for (let i = 0; i < candidatos.length; i++) {
    const n = String(candidatos[i] || '').trim();
    if (!n) continue;
    if (n === chatId) continue;
    if (n.indexOf('@g.us') !== -1) continue;
    return n.slice(0, 80);
  }
  return '';
}

const itens = $input.all().map(function (i) { return i.json || {}; });
const bruto = itens.length > 1 ? itens : listaDe(itens[0] || {});
const vistos = {};
const grupos = [];

for (let i = 0; i < bruto.length; i++) {
  const g = bruto[i] || {};
  const chatId = chatIdDe(g);
  if (!chatId || chatId.indexOf('@g.us') === -1) continue;
  if (vistos[chatId]) continue;
  vistos[chatId] = true;
  grupos.push({ chat_id: chatId, nome: nomeDe(g, chatId) });
}

grupos.sort(function (a, b) {
  const an = a.nome || a.chat_id;
  const bn = b.nome || b.chat_id;
  return an.localeCompare(bn, 'pt-BR');
});

return [{ json: { grupos: grupos, grupos_json: JSON.stringify(grupos) } }];
