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

function fonteFoto(post) {
  const urlPagina = paginaProduto(post);
  return urlPagina ? 'ml' : (post.tem_imagem === true ? 'origem' : 'nenhuma');
}

const produto = 'https://www.mercadolivre.com.br/blister-quadruplo-me05-escuridao-absoluta-pokemon-copag/p/MLB74454821';
assert.equal(paginaProduto({ url_produto: produto + '?matt_word=x', item_ids: 'MLB74454821', tipo_item: 'catalogo' }), produto);
assert.equal(paginaProduto({ url_produto: 'https://www.mercadolivre.com.br/social/milenaoliveirar', item_ids: 'MLB74454821', tipo_item: 'catalogo' }), 'https://www.mercadolivre.com.br/p/MLB74454821');
assert.equal(paginaProduto({ url_produto: '', item_ids: 'MLB6072858336', tipo_item: 'anuncio' }), 'https://www.mercadolivre.com.br/MLB-6072858336');
assert.equal(paginaProduto({ url_produto: '', item_ids: 'MLBU3914159030', tipo_item: 'user_product' }), 'https://www.mercadolivre.com.br/up/MLBU3914159030');
assert.equal(paginaProduto({ url_produto: '', item_ids: '', tipo_item: '' }), '');

assert.equal(fonteFoto({ url_produto: produto, tem_imagem: false }), 'ml');
assert.equal(fonteFoto({ url_produto: '', tem_imagem: true }), 'origem');
assert.equal(fonteFoto({ url_produto: '', tem_imagem: false }), 'nenhuma');

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

console.log('ok: regras da foto da replica');
