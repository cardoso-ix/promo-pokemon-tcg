// Replica Painel -> node Montar Pagina
// Le replica_config.pagina_gz (base64 UTF-8). Sem aspas duplas nem barra invertida.
// Nao injetar modal/rotas aqui: patch com aspas quebra o node (tela branca).
let entrada = {};
try { entrada = $('Carregar Dados').first().json || {}; } catch (e) {
  entrada = ($input.last() || $input.first() || { json: {} }).json;
}
const dados = entrada.painel || {};
let listaOp = [];
try {
  const extra = $input.first().json || {};
  listaOp = extra.rotas_opcoes || [];
} catch (e) { listaOp = []; }
if (typeof listaOp === 'string') {
  try { listaOp = JSON.parse(listaOp); } catch (e2) { listaOp = []; }
}
if (Array.isArray(listaOp) && listaOp.length && Array.isArray(dados.rotas)) {
  const mapa = {};
  for (let i = 0; i < listaOp.length; i++) {
    if (listaOp[i] && listaOp[i].id != null && listaOp[i].opcoes) mapa[String(listaOp[i].id)] = listaOp[i].opcoes;
  }
  dados.rotas = dados.rotas.map(function (r) {
    const o = mapa[String(r.id)];
    if (o) r.opcoes = o;
    return r;
  });
}
let tokenSave = 'a71e4f516c59fea873e4b07b92e8f26008f215a2dd406f30';
try {
  if (typeof $env !== 'undefined' && $env.REPLICA_PAINEL_SAVE_TOKEN) {
    const v = String($env.REPLICA_PAINEL_SAVE_TOKEN).trim();
    if (v) tokenSave = v;
  }
} catch (e) {}
dados.save_token = tokenSave;
if (dados.config) delete dados.config.save_token;
const paginaGz = dados.pagina_gz || '';
delete dados.pagina_gz;
let PAGINA = '<!DOCTYPE html><html lang=pt-BR><body style=background:#09090b;color:#f3efe6;font-family:sans-serif;padding:2rem>Painel em atualizacao. Recarregue com Ctrl+F5.</body></html>';
let erroGz = '';
try {
  if (paginaGz) {
    PAGINA = Buffer.from(paginaGz, 'base64').toString('utf8');
    if (PAGINA.indexOf('__DADOS__') < 0) erroGz = 'HTML sem marcador';
  } else erroGz = 'pagina_gz vazio';
} catch (e) { erroGz = String(e && e.message ? e.message : e); }
if (PAGINA.indexOf('</html>') === -1) {
  erroGz = (erroGz ? erroGz + ' + ' : '') + 'HTML sem fechamento';
}

function aplicarPatchLogin(html) {
  const q = String.fromCharCode(39);
  const nl = String.fromCharCode(10);
  if (html.indexOf('function recarregarPainel') === -1) {
    const patch = [
      'function tokenPainel() {',
      '  try { return sessionStorage.getItem(' + q + 'replicaPainelAuth' + q + ') || ' + q + q + '; } catch (e) { return ' + q + q + '; }',
      '}',
      'function recarregarPainel() {',
      '  var token = tokenPainel();',
      '  var hash = location.hash || ' + q + q + ';',
      '  if (!token) { location.href = ' + q + '/webhook/replica/entrar' + q + ' + hash; return; }',
      '  fetch(BASE, { headers: { Authorization: token }, cache: ' + q + 'no-store' + q + ' }).then(function (res) {',
      '    if (!res.ok) throw new Error(' + q + 'auth' + q + ');',
      '    return res.text();',
      '  }).then(function (htmlNovo) { document.open(); document.write(htmlNovo); document.close(); }).catch(function () {',
      '    try { sessionStorage.removeItem(' + q + 'replicaPainelAuth' + q + '); } catch (e2) {}',
      '    location.href = ' + q + '/webhook/replica/entrar' + q + ' + hash;',
      '  });',
      '}',
      ''
    ].join(nl);
    html = html.replace('function enviar(sufixo, corpo) {', patch + 'function enviar(sufixo, corpo) {');
  }
  return html.split('location.reload();').join('recarregarPainel();');
}

PAGINA = aplicarPatchLogin(PAGINA);
if (PAGINA.indexOf('function recarregarPainel') === -1) {
  erroGz = (erroGz ? erroGz + ' + ' : '') + 'HTML sem recarregarPainel';
}
const codificado = Buffer.from(JSON.stringify(dados)).toString('base64');
return [{ json: { html: PAGINA.replace('__DADOS__', codificado), erroGz: erroGz, gzLen: String(paginaGz || '').length } }];
