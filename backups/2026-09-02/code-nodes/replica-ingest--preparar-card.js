// Replica WhatsApp Ingest -> node "Preparar Card"
// Prefere a foto do polycard ja extraida em Montar Post (url_foto_html).
// A pagina /p/ do ML e anti-bot na VPS; nao depende dela para ter imagem.
// Sem polycard, ainda tenta a pagina do produto. Sem as duas e sem foto da
// origem, segue so texto. A foto do anuncio vai inteira (sem card composto).

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function precoWhatsapp(texto) {
  return String(texto || '').replace(/R\$\s*/g, 'R$' + '\u200B' + ' ');
}

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

const post = $('Montar Post').first().json;
let cfg = {};
try { cfg = $('Consultar Rota e Config').first().json || {}; } catch (e) { cfg = {}; }
const n = parseInt(cfg.limite_legenda_telegram, 10);
const LIMITE = Number.isFinite(n) && n > 0 ? n : 1024;

const texto = String(post.texto_publicado || '');
const temOrigem = post.tem_imagem === true;
const gerarImagem = post.gerar_imagem !== false;
const itemId = String(post.item_ids || '').split(',')[0].trim().toUpperCase();
const urlPagina = paginaProduto(post);
const buyLink = String(post.url_visivel || post.url_afiliado || '').trim();
const urlFotoHtml = String(post.url_foto_html || '').trim();
const temFotoHtml = /^https?:\/\/http2\.mlstatic\.com\//i.test(urlFotoHtml);

const fonteFoto = temFotoHtml ? 'html' : (urlPagina ? 'ml' : (temOrigem ? 'origem' : 'nenhuma'));
const montar = gerarImagem && fonteFoto !== 'nenhuma';

return [{
  json: {
    titulo: String(post.titulo_produto || '').slice(0, 90),
    preco_de: '',
    preco_por: '',
    cupom: '',
    linha_marca: ' ',
    linha_de: ' ',
    linha_por: ' ',
    linha_cupom: ' ',
    linha_preco: ' ',
    linha_off: ' ',
    linha_extra: ' ',
    linha_rodape: ' ',
    item_id: itemId,
    url_item: urlPagina,
    url_produto: urlPagina,
    url_foto_card: temFotoHtml ? urlFotoHtml : '',
    tem_url_foto: temFotoHtml,
    fonte_foto: fonteFoto,
    montar_card: montar,
    tem_imagem_origem: temOrigem,
    texto_publicado: texto,
    legenda_telegram: escHtml(texto),
    legenda_whatsapp: precoWhatsapp(texto),
    buy_link: buyLink,
    link_curto: /\/webhook\/replica\/s/i.test(buyLink),
    usar_foto: montar && texto.length <= LIMITE,
    preview_link: post.gerar_imagem_preview === true && !montar,
  },
}];
