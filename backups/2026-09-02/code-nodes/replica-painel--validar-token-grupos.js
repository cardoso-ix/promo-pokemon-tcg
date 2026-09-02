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
return [{ json: { ok: true, acao: 'atualizar_grupos' } }];