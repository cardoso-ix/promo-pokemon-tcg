#!/usr/bin/env node
// Testes locais das regras da foto da replica (sem n8n).
import { strict as assert } from 'node:assert';

function paginaProduto(post) {
  const u = String(post.url_produto || '').trim().split('#')[0].split('?')[0];
  if (/^https:\/\/www\.mercadolivre\.com\.br\//i.test(u) && !/\/social\//i.test(u)) return u;
  const id = String(post.item_ids || '').split(',')[0].trim().toUpperCase();
  if (/^MLBU\d+$/.test(id)) return 'https://www.mercadolivre.com.br/up/' + id;
  if (String(post.tipo_item || '') === 'catalogo' && /^MLB\d+$/.test(id)) {
    return 'https://www.mercadolivre.com.br/p/' + id;
  }
  if (/^MLB\d+$/.test(id)) return 'https://www.mercadolivre.com.br/MLB-' + id.replace(/^MLB/, '');
  return '';
}

function normalizarFotoMl(url) {
  let u = String(url || '').trim()
    .replace(/&amp;/g, '&')
    .replace(/\\u002[fF]/g, '/')
    .replace(/\\\//g, '/');
  if (u.indexOf('//') === 0) u = 'https:' + u;
  if (!/^https?:\/\//i.test(u)) return '';
  if (/http2\.mlstatic\.com/i.test(u)) {
    u = u.replace(/\.webp(?=\?|#|$)/i, '.jpg');
    u = u.replace(/-(I|W|V|G|B|C)(\.(?:jpe?g|png))(?=\?|#|$)/i, '-O$2');
    if (/\/D_NQ_NP_(?!2X_)/i.test(u)) {
      u = u.replace(/\/D_NQ_NP_/i, '/D_NQ_NP_2X_');
    }
  }
  return u;
}

function paginaBloqueada(html) {
  const s = String(html || '');
  if (s.length < 800) return true;
  return /suspicious-traffic|account-verification|security\.js|x-is-search-bot/i.test(s);
}

function metaDoHtml(html, nomes) {
  const s = String(html || '');
  const dq = String.fromCharCode(34);
  const sq = String.fromCharCode(39);
  const aspas = '[' + dq + sq + ']';
  const naoAspas = '[^' + dq + sq + ']+';
  for (let i = 0; i < nomes.length; i++) {
    const nome = nomes[i];
    const re = new RegExp('<meta[^>]+(?:property|name)=' + aspas + nome + aspas + '[^>]+content=' + aspas + '(' + naoAspas + ')' + aspas, 'i');
    const a = re.exec(s);
    if (a && a[1]) return a[1].trim();
    const re2 = new RegExp('<meta[^>]+content=' + aspas + '(' + naoAspas + ')' + aspas + '[^>]+(?:property|name)=' + aspas + nome + aspas, 'i');
    const b = re2.exec(s);
    if (b && b[1]) return b[1].trim();
  }
  return '';
}

function fotoDoHtml(html) {
  const s = String(html || '');
  if (paginaBloqueada(s)) return '';
  if (/\/social\//i.test(s.slice(0, 4000)) && /og:url[^>]+\/social\//i.test(s.slice(0, 8000))) return '';
  const og = normalizarFotoMl(metaDoHtml(s, ['og:image', 'og:image:url', 'image', 'twitter:image']));
  if (og && /mlstatic\.com/i.test(og)) return og;
  const m = /https?:\/\/http2\.mlstatic\.com\/D_NQ_NP_[A-Za-z0-9_-]+\.(?:webp|jpe?g|png)/i.exec(s);
  return m ? normalizarFotoMl(m[0]) : '';
}

function decodificarHtml(html) {
  return String(html || '').replace(/&amp;/g, '&').replace(/\\u002[fF]/g, '/').replace(/\\\//g, '/');
}

function fotoDoPolycard(html, ids) {
  const s = decodificarHtml(html);
  const lista = String(ids || '').split(',').map(function (x) { return x.trim().toUpperCase(); }).filter(Boolean);
  for (let i = 0; i < lista.length; i++) {
    const id = lista[i];
    if (!/^MLB/i.test(id)) continue;
    const reMeta = new RegExp('"(?:product_id|user_product_id|id)"\\s*:\\s*"' + id + '"', 'i');
    const m = reMeta.exec(s);
    if (!m) continue;
    const fatia = s.slice(Math.max(0, m.index - 400), m.index + 8000);
    const pic = /"pictures"\s*:\s*\{\s*"scale"\s*:\s*"[^"]*"\s*,\s*"pictures"\s*:\s*\[\s*\{\s*"id"\s*:\s*"([^"]+)"/.exec(fatia)
      || /"pictures"\s*:\s*\[\s*\{\s*"id"\s*:\s*"([^"]+)"/.exec(fatia);
    if (pic && pic[1]) {
      return normalizarFotoMl('https://http2.mlstatic.com/D_NQ_NP_' + pic[1] + '-O.webp');
    }
  }
  return '';
}

function tituloDoPolycard(html, ids) {
  const s = decodificarHtml(html);
  const lista = String(ids || '').split(',').map(function (x) { return x.trim().toUpperCase(); }).filter(Boolean);
  for (let i = 0; i < lista.length; i++) {
    const id = lista[i];
    if (!/^MLB/i.test(id)) continue;
    const reMeta = new RegExp('"(?:product_id|user_product_id|id)"\\s*:\\s*"' + id + '"', 'i');
    const m = reMeta.exec(s);
    if (!m) continue;
    const fatia = s.slice(Math.max(0, m.index - 400), m.index + 8000);
    const tit = /"title"\s*:\s*\{\s*"text"\s*:\s*"([^"]+)"/.exec(fatia);
    if (tit && tit[1]) return tit[1].trim();
  }
  return '';
}

function textoJaTemTitulo(texto) {
  const linhas = String(texto || '').split('\n').map(function (s) { return s.replace(/[_*~`]/g, '').trim(); }).filter(Boolean);
  if (!linhas.length) return false;
  const first = linhas[0];
  if (/^(❌|👉🏼|👉|➡️|🏷️|🔖|🔗|🛒|http)/i.test(first)) return false;
  if (/^(DE:|POR:|Cupom:)/i.test(first)) return false;
  if (/^R\$/.test(first)) return false;
  return first.length >= 6;
}

function injetarTitulo(texto, titulo) {
  const t = String(titulo || '').replace(/\s+/g, ' ').trim();
  if (!t || textoJaTemTitulo(texto)) return String(texto || '');
  const a = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const b = String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (a.length >= 10 && b.indexOf(a.slice(0, 18)) !== -1) return String(texto || '');
  return t + '\n\n' + String(texto || '').replace(/^\s+/, '');
}

function prepararCard(post) {
  const temOrigem = post.tem_imagem === true;
  const gerarImagem = post.gerar_imagem !== false;
  const urlPagina = paginaProduto(post);
  const urlFotoHtml = String(post.url_foto_html || '').trim();
  const temFotoHtml = /^https?:\/\/http2\.mlstatic\.com\//i.test(urlFotoHtml);
  const fonteFoto = temFotoHtml ? 'html' : (urlPagina ? 'ml' : (temOrigem ? 'origem' : 'nenhuma'));
  const montar = gerarImagem && fonteFoto !== 'nenhuma';
  return {
    fonte_foto: fonteFoto,
    tem_url_foto: temFotoHtml,
    url_foto_card: temFotoHtml ? urlFotoHtml : '',
    montar_card: montar,
    usar_foto: montar && String(post.texto_publicado || 'x').length <= 1024,
  };
}

const produto = 'https://www.mercadolivre.com.br/blister-quadruplo-me05-escuridao-absoluta-pokemon-copag/p/MLB74454821';
assert.equal(paginaProduto({ url_produto: produto + '?matt_word=x', item_ids: 'MLB74454821', tipo_item: 'catalogo' }), produto);
assert.equal(paginaProduto({ url_produto: 'https://www.mercadolivre.com.br/social/milenaoliveirar', item_ids: 'MLB74454821', tipo_item: 'catalogo' }), 'https://www.mercadolivre.com.br/p/MLB74454821');
assert.equal(paginaProduto({ url_produto: '', item_ids: 'MLB6072858336', tipo_item: 'anuncio' }), 'https://www.mercadolivre.com.br/MLB-6072858336');
assert.equal(paginaProduto({ url_produto: '', item_ids: 'MLBU3914159030', tipo_item: 'user_product' }), 'https://www.mercadolivre.com.br/up/MLBU3914159030');
assert.equal(paginaProduto({ url_produto: '', item_ids: '', tipo_item: '' }), '');

assert.equal(
  normalizarFotoMl('https://http2.mlstatic.com/D_NQ_NP_917866-MLA114013158499_072026-I.webp'),
  'https://http2.mlstatic.com/D_NQ_NP_2X_917866-MLA114013158499_072026-O.jpg',
);

const htmlProduto = `<!DOCTYPE html><html lang="pt-BR"><head>${'x'.repeat(800)}`
  + '<meta property="og:image" content="https://http2.mlstatic.com/D_NQ_NP_123-MLB999_022026-I.webp"/>'
  + '<meta property="og:url" content="https://www.mercadolivre.com.br/blister/p/MLB74454821"/>'
  + '</head><body>ok</body></html>';
assert.equal(
  fotoDoHtml(htmlProduto),
  'https://http2.mlstatic.com/D_NQ_NP_2X_123-MLB999_022026-O.jpg',
);

const htmlSocial = `<!DOCTYPE html><html>${'y'.repeat(800)}`
  + '<meta property="og:image" content="https://http2.mlstatic.com/D_NQ_NP_917866-MLA114013158499_072026-O.webp"/>'
  + '<meta property="og:url" content="https://www.mercadolivre.com.br/social/milenaoliveirar"/>'
  + '</head></html>';
assert.equal(fotoDoHtml(htmlSocial), '');

const htmlBot = `<!DOCTYPE html><html>${'z'.repeat(800)}<title>account-verification</title></html>`;
assert.equal(fotoDoHtml(htmlBot), '');
assert.equal(fotoDoHtml('<html>curto</html>'), '');

const htmlPolycard = '{"polycards":[{"metadata":{"id":"MLB4841730415","product_id":"MLB52893450","user_product_id":"MLBU4213316654"},'
  + '"pictures":{"scale":"FILL","pictures":[{"id":"752085-MLA99977285401_112025"}]}}]}';
assert.equal(
  fotoDoPolycard(htmlPolycard, 'MLB52893450'),
  'https://http2.mlstatic.com/D_NQ_NP_2X_752085-MLA99977285401_112025-O.jpg',
);
assert.equal(fotoDoPolycard(htmlPolycard, 'MLB00000000'), '');
assert.equal(fotoDoPolycard(htmlSocial, 'MLB52893450'), '');
assert.equal(
  tituloDoPolycard(
    '{"product_id":"MLB52893450","pictures":{"scale":"FILL","pictures":[{"id":"752085-MLA99977285401_112025"}]},"title":{"text":"Box Ursaluna Lua Sangrenta EX"}}',
    'MLB52893450',
  ),
  'Box Ursaluna Lua Sangrenta EX',
);

const soPreco = '❌ ~DE: R$190~\n👉🏼 *POR: R$111*\n\n🏷️ Cupom: *BEBE0209*\n\nhttps://meli.la/x';
assert.equal(textoJaTemTitulo(soPreco), false);
assert.match(injetarTitulo(soPreco, 'Box Pokémon Mega Charizard Y'), /^Box Pokémon Mega Charizard Y\n\n❌/);
assert.equal(
  injetarTitulo('_Box Ursaluna Lua Sangrenta EX_\n\n❌ ~DE: R$196~\n', 'Cartas Pokémon Box Ursaluna Lua Sangrenta EX Com 40 Un Copag'),
  '_Box Ursaluna Lua Sangrenta EX_\n\n❌ ~DE: R$196~\n',
);

const cardHtml = prepararCard({
  url_foto_html: 'https://http2.mlstatic.com/D_NQ_NP_2X_752085-MLA99977285401_112025-O.jpg',
  url_produto: produto,
  tem_imagem: false,
  texto_publicado: 'Box Ursaluna',
});
assert.equal(cardHtml.fonte_foto, 'html');
assert.equal(cardHtml.tem_url_foto, true);
assert.equal(cardHtml.montar_card, true);
assert.equal(cardHtml.usar_foto, true);
assert.match(cardHtml.url_foto_card, /752085-MLA99977285401_112025/);

const cardPagina = prepararCard({
  url_foto_html: '',
  url_produto: produto,
  tem_imagem: false,
  texto_publicado: 'Blister',
});
assert.equal(cardPagina.fonte_foto, 'ml');
assert.equal(cardPagina.tem_url_foto, false);
assert.equal(cardPagina.montar_card, true);

const cardOrigem = prepararCard({ url_foto_html: '', url_produto: '', tem_imagem: true });
assert.equal(cardOrigem.fonte_foto, 'origem');
assert.equal(cardOrigem.tem_url_foto, false);

const cardNada = prepararCard({ url_foto_html: '', url_produto: '', tem_imagem: false });
assert.equal(cardNada.fonte_foto, 'nenhuma');
assert.equal(cardNada.montar_card, false);
assert.equal(cardNada.usar_foto, false);

console.log('ok: regras da foto da replica');
