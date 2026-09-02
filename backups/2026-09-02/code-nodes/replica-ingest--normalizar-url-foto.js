// Replica WhatsApp Ingest -> node "Normalizar URL da Foto"
// Prefere a foto oficial do anuncio. Aceita JSON da API (pictures[]) ou HTML
// da pagina do produto (og:image). Sobe thumb -I/-W para -O e adiciona 2X.
// Nao usa canvas/crop — a foto do anuncio vai inteira.
// Recusa og:image de pagina /social/ (vitrine de terceiro).

const prep = $('Preparar Card').first().json;
const item = $input.first().json || {};
const fotos = Array.isArray(item.pictures) ? item.pictures : [];

function htmlDoItem(obj) {
  if (!obj || typeof obj !== 'object') return '';
  if (typeof obj.body === 'string') return obj.body;
  if (typeof obj.data === 'string') return obj.data;
  if (obj.data && typeof obj.data === 'object' && typeof obj.data.data === 'string') return obj.data.data;
  return '';
}

function paginaBloqueada(html) {
  const s = String(html || '');
  if (s.length < 800) return true;
  return /suspicious-traffic|account-verification|security\.js|x-is-search-bot/i.test(s);
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

function areaDe(size) {
  const m = /^(\d+)\s*x\s*(\d+)$/i.exec(String(size || ''));
  return m ? Number(m[1]) * Number(m[2]) : 0;
}

function maiorFotoApi(lista) {
  let best = '';
  let bestArea = 0;
  for (let i = 0; i < lista.length; i++) {
    const p = lista[i] || {};
    const u = normalizarFotoMl(p.secure_url || p.url || '');
    const area = areaDe(p.max_size) || areaDe(p.size) || (u ? 1 : 0);
    if (u && area >= bestArea) {
      best = u;
      bestArea = area;
    }
  }
  return best;
}

const html = htmlDoItem(item);
const urlApi = maiorFotoApi(fotos) || normalizarFotoMl(item.secure_thumbnail || item.thumbnail || '');
const urlHtml = fotoDoHtml(html);
const urlPrep = normalizarFotoMl(prep.url_foto_card || item.url_foto_card || '');
const url = urlApi || urlHtml || urlPrep;
const ok = /^https?:\/\//i.test(url);
const origem = $('Montar Post').first().json;

return [{
  json: Object.assign({}, prep, {
    titulo: prep.titulo || String(item.title || item.name || '').slice(0, 90),
    url_foto_card: ok ? url : '',
    tem_url_foto: ok,
    fallback_origem: !ok && origem.tem_imagem === true,
    montar_card: ok || origem.tem_imagem === true,
    usar_foto: ok || origem.tem_imagem === true,
  }),
}];
