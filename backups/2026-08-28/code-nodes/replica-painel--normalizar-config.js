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
  frases_remover: 'texto_longo'
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
} else {
  valor = valor.slice(0, 200);
}

return [{ json: { chave: chave, valor: valor } }];
