// Replica Painel -> node "Normalizar Config"
// So deixa passar as chaves que o painel conhece, para o formulario nao virar porta de entrada
// para chave arbitraria em replica_config.
const corpo = $input.first().json.body || {};

const PERMITIDAS = {
  ativo: 'booleano',
  destino_telegram: 'texto',
  delay_segundos: 'inteiro',
  teto_hora: 'inteiro',
  replicar_cupom_sem_link: 'booleano',
  afiliado_matt_word: 'texto',
  afiliado_matt_tool: 'texto'
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
} else {
  valor = valor.slice(0, 200);
}

return [{ json: { chave: chave, valor: valor } }];
