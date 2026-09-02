// Replica Health Alert -> node "Avaliar Saude"
// Monta o texto para @eduardo_alerta_bot. Nao usa o bot do canal publico.
function asList(v) {
  if (Array.isArray(v)) return v;
  if (v == null || v === '') return [];
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

function verdade(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  return s === 'true' || s === 't' || s === '1' || s === 'sim' || v === true;
}

const d = $input.first().json || {};
let isManual = false;
try {
  isManual = Boolean($('Manual Trigger').isExecuted);
} catch (e) {
  isManual = false;
}
if (!isManual) {
  const mode = String($execution.mode || '');
  isManual = mode === 'manual' || mode === 'test';
}

const sintomas = [];
const replicaAtiva = verdade(d.replica_ativa);
const waConectado = verdade(d.wa_conectado);
const waEstado = String(d.wa_estado || 'ausente');
const rotasAtivas = Number(d.rotas_ativas || 0);
const origensAtivas = Number(d.origens_ativas || 0);
const destinosTg = Number(d.destinos_tg_ativos || 0);
const erros24h = Number(d.erros_24h || 0);
const pendentesPresos = Number(d.pendentes_presos || 0);
const eventos3h = Number(d.eventos_3h || 0);
const hora = Number(d.hora_brt);
const errosAmostra = asList(d.erros_amostra);

if (!waConectado) {
  sintomas.push(
    'WhatsApp (promo-replica): desconectado (estado=' + waEstado + '). Abra /webhook/replica/conectar e leia o QR.'
  );
}
if (!replicaAtiva) {
  sintomas.push('Painel: a replica esta desligada (replica_config.ativo). O interruptor da sidebar.');
}
if (rotasAtivas < 1 || origensAtivas < 1) {
  sintomas.push(
    'Nenhuma rota ativa com origem de WhatsApp (rotas=' + rotasAtivas + ', origens=' + origensAtivas + ').'
  );
}
if (destinosTg < 1) {
  sintomas.push('Nenhum destino Telegram ativo nas rotas. O canal nao vai receber post.');
}
if (erros24h > 0) {
  const resumo = errosAmostra.slice(0, 5).map(function (e) {
    return (e.quando || '') + ' ' + String(e.motivo || '').slice(0, 80);
  }).join(' | ');
  sintomas.push(
    'replica_log: ' + erros24h + ' erro(s) nas ultimas 24h' + (resumo ? ' (' + resumo + ')' : '')
  );
}
if (pendentesPresos > 0) {
  sintomas.push(
    'replica_log: ' + pendentesPresos + ' mensagem(ns) presas em pendente ha mais de 20 min (Telegram pode ter falhado).'
  );
}
if (replicaAtiva && waConectado && origensAtivas > 0 && hora >= 12 && hora < 21 && eventos3h === 0) {
  sintomas.push(
    'Ingest: WhatsApp conectado e rota ativa, mas zero eventos em replica_log nas ultimas 3h (12h-21h BRT). O webhook pode ter parado.'
  );
}

const unique = [];
for (const s of sintomas) {
  if (unique.indexOf(s) === -1) unique.push(s);
}
const hasProblems = unique.length > 0;

let text;
if (hasProblems) {
  text = [
    'ALERTA Replica TCG — a esteira de WhatsApp quebrou ou parou',
    '',
    unique.map(function (s) { return '- ' + s; }).join('\n'),
    '',
    'Ultimo post da replica: ' + (d.ultimo_envio_brt || 'nunca'),
    'Agora: ' + (d.agora_brt || '') + ' BRT',
    isManual ? 'Origem: execucao manual' : 'Origem: agenda a cada 30 min (mesmo recado no maximo a cada 3h)',
    'Destino: @eduardo_alerta_bot (mesmo chat do alerta LinkedIn). Nao vai ao canal @promopokemontcg.',
  ].join('\n');
} else {
  text = [
    'TESTE Replica Health Alert — tudo ok',
    '',
    'WhatsApp promo-replica: conectado (' + waEstado + ').',
    'Painel: replica ligada. Rotas ativas=' + rotasAtivas + ', origens=' + origensAtivas + ', destinos TG=' + destinosTg + '.',
    'Erros 24h: ' + erros24h + '. Pendentes presos: ' + pendentesPresos + '.',
    'Eventos 3h: ' + eventos3h + ' (zero eventos de madrugada NAO e alerta).',
    'Ultimo post da replica: ' + (d.ultimo_envio_brt || 'nunca'),
    'Agora: ' + (d.agora_brt || '') + ' BRT',
    '',
    'Mensagem de teste (execucao manual). A agenda de 30 min so avisa se houver problema.',
    'Destino: @eduardo_alerta_bot (mesmo chat do alerta LinkedIn). Nao vai ao canal @promopokemontcg.',
  ].join('\n');
}

let deve = hasProblems || isManual;
if (hasProblems && !isManual) {
  try {
    const staticData = $getWorkflowStaticData('global');
    const sig = unique.join('|');
    const agora = Date.now();
    const lastSig = String(staticData.lastSig || '');
    const lastAt = Number(staticData.lastAt || 0);
    const cooldownMs = 3 * 60 * 60 * 1000;
    if (sig === lastSig && agora - lastAt < cooldownMs) {
      deve = false;
    } else {
      staticData.lastSig = sig;
      staticData.lastAt = agora;
    }
  } catch (e) {}
}

return [{
  json: {
    deve_notificar: deve,
    tem_problema: hasProblems,
    is_manual: isManual,
    text: text,
    chatId: '6280219693',
  },
}];
