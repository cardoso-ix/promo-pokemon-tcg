// Replica Painel -> node Normalizar Lote
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
if (!tokenRecebido || tokenRecebido !== tokenSaveEsperado()) throw new Error('token de save invalido');
function soGrupoWhatsapp(id) {
  const v = String(id || '').trim();
  if (!v || v.indexOf('@g.us') === -1) return '';
  return v.slice(0, 80);
}
function destinosLimpos(lista) {
  if (!Array.isArray(lista)) return [];
  const vistos = {}; const saida = [];
  for (let i = 0; i < lista.length; i++) {
    const d = lista[i] || {};
    const plataforma = String(d.plataforma || '').trim() === 'whatsapp' ? 'whatsapp' : 'telegram';
    let identificador = String(d.identificador || '').trim();
    if (!identificador) continue;
    if (plataforma === 'whatsapp') { identificador = soGrupoWhatsapp(identificador); if (!identificador) continue; }
    else identificador = identificador.slice(0, 80);
    const chave = plataforma + '|' + identificador;
    if (vistos[chave]) continue;
    vistos[chave] = true;
    saida.push({ plataforma: plataforma, identificador: identificador, nome: String(d.nome || '').trim().slice(0, 80) });
  }
  return saida;
}
const acaoBruta = String(corpo.acao || 'salvar').trim();
const acao = acaoBruta === 'telegram_off' || acaoBruta === 'telegram' ? acaoBruta : 'salvar';
let telegramId = String(corpo.identificador || corpo.telegram_id || '').trim().slice(0, 80);
if (acao === 'telegram' && !telegramId) throw new Error('identificador do Telegram ausente');
const origensBrutas = Array.isArray(corpo.origens) ? corpo.origens : [];
const origens = []; const vistosOrigem = {};
for (let i = 0; i < origensBrutas.length; i++) {
  const id = soGrupoWhatsapp(origensBrutas[i]);
  if (!id || vistosOrigem[id]) continue;
  vistosOrigem[id] = true; origens.push(id);
}
const destinos = destinosLimpos(corpo.destinos);
const idsDestinoWa = {};
for (let i = 0; i < destinos.length; i++) {
  if (destinos[i].plataforma === 'whatsapp') idsDestinoWa[destinos[i].identificador] = true;
}
const origensFiltradas = origens.filter(function (id) { return !idsDestinoWa[id]; });
const idNum = parseInt(corpo.id, 10);
const id = Number.isFinite(idNum) && idNum > 0 ? String(idNum) : '';
const nome = String(corpo.nome || '').trim().slice(0, 80);
const ativo = corpo.ativo === false || corpo.ativo === 'false' ? 'false' : 'true';
const PLATS_OK = { mercadolivre: true, amazon: true, shopee: true, magalu: true, aliexpress: true, awin: true };
function platsLimpos(lista) {
  const raw = Array.isArray(lista) ? lista : String(lista || '').split(',');
  const saida = []; const vistos = {};
  for (let i = 0; i < raw.length; i++) {
    const pid = String(raw[i] || '').trim().toLowerCase();
    if (!PLATS_OK[pid] || vistos[pid]) continue;
    vistos[pid] = true; saida.push(pid);
  }
  return saida;
}
function boolCorpo(v, padrao) {
  if (v === true || v === 'true') return true;
  if (v === false || v === 'false') return false;
  return padrao;
}
const plataformas = platsLimpos(corpo.plataformas);
const opcoes = {
  plataformas: plataformas.length ? plataformas : ['mercadolivre'],
  gerar_imagem: boolCorpo(corpo.gerar_imagem, true),
  gerar_imagem_preview: boolCorpo(corpo.gerar_imagem_preview, false),
  frases_remover: String(corpo.frases_remover || '').slice(0, 800)
};
if (acao === 'salvar') {
  if (!nome) throw new Error('nome da rota ausente');
  if (!origensFiltradas.length) throw new Error('escolha pelo menos uma origem');
  if (!destinos.length) throw new Error('escolha pelo menos um destino');
}
return [{ json: { acao: acao, id: id, nome: nome || 'Nova rota', ativo: ativo, origens_json: JSON.stringify(origensFiltradas), destinos_json: JSON.stringify(destinos), telegram_id: telegramId, opcoes_json: JSON.stringify(opcoes) } }];
