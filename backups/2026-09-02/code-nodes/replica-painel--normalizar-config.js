// Replica Painel -> node "Normalizar Config"
// So deixa passar as chaves que o painel conhece, para o formulario nao virar porta de entrada
// para chave arbitraria em replica_config.
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

const PERMITIDAS = {
  ativo: 'booleano',
  destino_telegram: 'texto',
  delay_segundos: 'inteiro',
  teto_hora: 'inteiro',
  replicar_cupom_sem_link: 'booleano',
  afiliado_matt_word: 'texto',
  afiliado_matt_tool: 'texto',
  frases_remover: 'texto_longo',
  formato_post: 'json_longo',
  atraso_maximo_segundos: 'inteiro',
  plataformas: 'lista_plats',
  limite_legenda_telegram: 'inteiro'
};

const chave = String(corpo.chave || '').trim();
const tipo = PERMITIDAS[chave];
if (!tipo) {
  throw new Error('chave nao permitida: ' + chave);
}

let valor = String(corpo.valor === undefined || corpo.valor === null ? '' : corpo.valor).trim();

if (tipo === 'booleano') {
  valor = valor === 'true' ? 'true' : 'false';
} else if (tipo === 'inteiro') {
  const numero = parseInt(valor, 10);
  if (!Number.isFinite(numero) || numero < 0) {
    throw new Error('valor invalido para ' + chave + ': ' + valor);
  }
  valor = String(numero);
} else if (tipo === 'texto_longo') {
  valor = valor.slice(0, 800);
} else if (tipo === 'lista_plats') {
  const PLATS_OK = { mercadolivre: true, amazon: true, shopee: true, magalu: true, aliexpress: true };
  const CONVERSORES = { mercadolivre: true };
  let lista = [];
  try { lista = JSON.parse(valor); } catch (e) { lista = String(valor).split(/[\n,;]+/); }
  if (!Array.isArray(lista)) lista = [];
  const saida = [];
  const vistos = {};
  for (let i = 0; i < lista.length; i++) {
    const pid = String(lista[i] || '').trim().toLowerCase();
    if (!PLATS_OK[pid] || vistos[pid] || !CONVERSORES[pid]) continue;
    vistos[pid] = true;
    saida.push(pid);
  }
  if (!saida.length) saida.push('mercadolivre');
  valor = JSON.stringify(saida);
} else if (tipo === 'json_longo') {
  valor = valor.slice(0, 4000);
  try {
    const parsed = JSON.parse(valor);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('formato_post precisa ser um objeto');
    }
    valor = JSON.stringify(parsed);
  } catch (e) {
    throw new Error('json invalido para ' + chave + ': ' + (e && e.message ? e.message : e));
  }
} else {
  valor = valor.slice(0, 200);
}

return [{ json: { chave: chave, valor: valor } }];
