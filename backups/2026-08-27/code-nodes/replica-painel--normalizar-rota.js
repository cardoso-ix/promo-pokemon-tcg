// Replica Painel -> node "Normalizar Rota"
// Recebe o body do POST /replica/painel/rota e devolve valores tipados para o UPDATE.
// ativa e nome viram null quando nao foram enviados, e o SQL usa COALESCE para manter o valor atual.
const corpo = $input.first().json.body || {};

const chatId = String(corpo.chat_id || '').trim();
if (!chatId) {
  throw new Error('chat_id ausente no pedido');
}

function paraBooleanOuNulo(valor) {
  if (valor === true || valor === 'true') return true;
  if (valor === false || valor === 'false') return false;
  return null;
}

const nomeCru = corpo.nome;
const nome = nomeCru === undefined || nomeCru === null ? null : String(nomeCru).trim().slice(0, 80);

return [{
  json: {
    chat_id: chatId,
    ativa: paraBooleanOuNulo(corpo.ativa),
    nome: nome === '' ? null : nome
  }
}];
