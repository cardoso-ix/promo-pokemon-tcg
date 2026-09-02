// Replica Painel -> node "Normalizar Rota"
// POST /replica/painel/rota — liga/desliga ou exclui uma rota NOMEADA.
const corpo = $input.first().json.body || {};

function tokenSaveEsperado() {
  try {
    if (typeof $env !== 'undefined' && $env.REPLICA_PAINEL_SAVE_TOKEN) {
      const v = String($env.REPLICA_PAINEL_SAVE_TOKEN).trim();
      if (v) return v;
    }
  } catch (e) {}
  return 'a71e4f516c59fea873e4b07b92e8f26008f215a2dd406f30';
}

const tokenRecebido = String(corpo.token || '').trim();
if (!tokenRecebido || tokenRecebido !== tokenSaveEsperado()) {
  throw new Error('token de save invalido');
}

const idNum = parseInt(corpo.id, 10);
if (!Number.isFinite(idNum) || idNum < 1) {
  throw new Error('id da rota ausente no pedido');
}

function paraBooleanOuNulo(valor) {
  if (valor === true || valor === 'true') return 'true';
  if (valor === false || valor === 'false') return 'false';
  return '';
}

const excluir = corpo.excluir === true || corpo.excluir === 'true';

return [{
  json: {
    id: String(idNum),
    ativo: excluir ? '' : paraBooleanOuNulo(corpo.ativa),
    excluir: excluir ? 'true' : 'false'
  }
}];
