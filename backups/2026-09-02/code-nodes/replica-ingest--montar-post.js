// Replica WhatsApp Ingest -> node "Montar Post" (Code, runOnceForAllItems)
// Copia IDENTICA. Troca so afiliado das plataformas LIGADAS. Aplica frases_remover.

const DOMINIOS_ML = ['mercadolivre.com.br', 'mercadolibre.com', 'mercadolivre.com'];
const ENCURTADORES_ML = ['meli.la', 'mlb.to'];
const OUTROS_MARKETPLACES = [
  'amazon.com', 'amzn.to', 'shopee.com', 'shope.ee', 'aliexpress.com',
  'magazineluiza.com', 'magalu.com', 'americanas.com', 'casasbahia.com', 'pontofrio.com',
  'kabum.com', 'terabyteshop.com', 'pichau.com', 'netshoes.com', 'centauro.com',
  'submarino.com', 'carrefour.com', 'temu.com', 'shein.com', 'nike.com.br',
];

function limiteLegendaTelegram(cfg) {
  const n = parseInt(cfg && cfg.limite_legenda_telegram, 10);
  if (Number.isFinite(n) && n > 0) return n;
  return 1000;
}

const MARCAS_PADRAO = ['@rasgabooster.tcg', '@rasgabooster', '#rasgaboot', '#rasgabooster', 'rasgabooster.tcg'];

function hostDe(url) {
  const m = /^https?:\/\/([^/?#]+)/i.exec(String(url || ''));
  return m ? m[1].toLowerCase().replace(/^www\./, '') : '';
}
function terminaCom(host, lista) {
  return lista.some(function (d) { return host === d || host.endsWith('.' + d); });
}
function montarLinkAfiliado(url, apelido, etiqueta) {
  const base = String(url).split('#')[0].split('?')[0];
  return base + '?matt_word=' + apelido + '&matt_tool=' + etiqueta + '&forceInApp=true';
}
function montarLinkSocialProprio(apelido, etiqueta) {
  return 'https://www.mercadolivre.com.br/social/' + apelido + '?matt_word=' + apelido + '&matt_tool=' + etiqueta + '&forceInApp=true';
}
function montarLinkCompacto(urlProduto, id, apelido, etiqueta) {
  const base = String(urlProduto || '').split('#')[0].split('?')[0];
  const item = String(id || '').toUpperCase();
  if (/^https?:\/\//i.test(base) && (/\/p\/MLB/i.test(base) || /\/up\/MLBU/i.test(base) || /\/MLB-\d+/i.test(base))) return montarLinkAfiliado(base, apelido, etiqueta);
  if (/^MLBU\d+$/.test(item)) return montarLinkAfiliado('https://www.mercadolivre.com.br/up/' + item, apelido, etiqueta);
  if (/^MLB\d+$/.test(item)) return montarLinkAfiliado('https://www.mercadolivre.com.br/MLB-' + item.replace(/^MLB/, ''), apelido, etiqueta);
  return montarLinkAfiliado(base, apelido, etiqueta);
}
function idCurto() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  try {
    const bytes = require('crypto').randomBytes(8);
    for (let i = 0; i < 8; i++) s += chars[bytes[i] % chars.length];
  } catch (e) {
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}
function itemIdDe(url) {
  const userProd = /\/up\/(MLBU\d+)/i.exec(url);
  if (userProd) return userProd[1].toUpperCase();
  const produto = /\/p\/(MLB\d+)/i.exec(url);
  if (produto) return produto[1].toUpperCase();
  const anuncio = /\/MLB-?(\d{6,})/i.exec(url);
  if (anuncio) return 'MLB' + anuncio[1];
  return '';
}
function tipoDeUrl(url) {
  if (/\/up\/MLBU\d+/i.test(url)) return 'user_product';
  if (/\/p\/MLB\d+/i.test(url)) return 'catalogo';
  if (/\/MLB-?\d{6,}/i.test(url)) return 'anuncio';
  return '';
}
function ehVitrineSocial(url) { return /\/social\//i.test(String(url || '')); }
function decodificarHtml(html) {
  return String(html || '').replace(/&amp;/g, '&').replace(/\\u002[fF]/g, '/').replace(/\\\//g, '/');
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
function normalizarFotoMl(url) {
  let u = String(url || '').trim().replace(/&amp;/g, '&').replace(/\\u002[fF]/g, '/').replace(/\\\//g, '/');
  if (u.indexOf('//') === 0) u = 'https:' + u;
  if (!/^https?:\/\//i.test(u)) return '';
  if (/http2\.mlstatic\.com/i.test(u)) {
    u = u.replace(/\.webp(?=\?|#|$)/i, '.jpg');
    u = u.replace(/-(I|W|V|G|B|C)(\.(?:jpe?g|png))(?=\?|#|$)/i, '-O$2');
    if (/\/D_NQ_NP_(?!2X_)/i.test(u)) u = u.replace(/\/D_NQ_NP_/i, '/D_NQ_NP_2X_');
  }
  return u;
}
function fotoAvulsaDoHtml(html) {
  const s = decodificarHtml(html);
  const og = normalizarFotoMl(metaDoHtml(s, ['og:image', 'og:image:url', 'image', 'twitter:image']));
  if (og) return og;
  const m = /https?:\/\/http2\.mlstatic\.com\/D_NQ_NP_[A-Za-z0-9_-]+\.(?:webp|jpe?g|png)/i.exec(s);
  return m ? normalizarFotoMl(m[0]) : '';
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
function fotoDosHtmls(htmlMap, ids) {
  const urls = Object.keys(htmlMap || {});
  for (let i = 0; i < urls.length; i++) {
    const foto = fotoDoPolycard(htmlMap[urls[i]], ids);
    if (foto) return foto;
  }
  return '';
}
function permalinkDoHtml(html, tituloHint) {
  const s = decodificarHtml(html);
  const ogTitle = metaDoHtml(s, ['og:title', 'title', 'twitter:title']);
  const ogImage = fotoAvulsaDoHtml(html);
  const vazio = { url: '', id: '', tipo: '', foto: ogImage, titulo: ogTitle };
  const palavras = String(ogTitle || tituloHint || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(function (w) { return w.length >= 3; });
  const candidatos = [];
  const vistos = {};
  function adicionar(url, id, tipo, slug) {
    const chave = String(id || url).toUpperCase();
    if (!chave || vistos[chave]) return;
    vistos[chave] = true;
    let pts = 0;
    const sl = String(slug || url || '').toLowerCase();
    for (let i = 0; i < palavras.length; i++) { if (sl.indexOf(palavras[i]) !== -1) pts += palavras[i].length >= 5 ? 2 : 1; }
    candidatos.push({ url: String(url || '').split('#')[0].split('?')[0], id: String(id || '').toUpperCase(), tipo: tipo, slug: slug || '', pontos: pts });
  }
  let m;
  const reUp = /(?:https?:\/\/)?(?:www\.)?mercadolivre\.com\.br\/([^"'?\s<>]+)\/up\/(MLBU\d+)/gi;
  while ((m = reUp.exec(s))) { adicionar('https://www.mercadolivre.com.br/' + m[1] + '/up/' + m[2], m[2], 'user_product', m[1]); if (candidatos.length >= 40) break; }
  const reCat = /(?:https?:\/\/)?(?:www\.)?mercadolivre\.com\.br\/([^"'?\s<>]+)\/p\/(MLB\d+)/gi;
  while ((m = reCat.exec(s))) { adicionar('https://www.mercadolivre.com.br/' + m[1] + '/p/' + m[2], m[2], 'catalogo', m[1]); if (candidatos.length >= 80) break; }
  const reAnuncio = /(?:https?:\/\/)?(?:www\.|produto\.)?mercadolivre\.com\.br\/[^"'?\s<>]*MLB-(\d{6,})/gi;
  while ((m = reAnuncio.exec(s))) { adicionar(m[0].indexOf('http') === 0 ? m[0] : ('https://' + m[0]), 'MLB' + m[1], 'anuncio', m[0]); if (candidatos.length >= 100) break; }
  if (!candidatos.length) return vazio;
  candidatos.sort(function (a, b) { return b.pontos - a.pontos; });
  const melhor = candidatos[0];
  if (!palavras.length || melhor.pontos < 2) return vazio;
  melhor.foto = ogImage;
  melhor.titulo = ogTitle;
  return melhor;
}
function escaparRegExp(texto) { return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function trocarTudo(texto, de, para) { return texto.split(de).join(para); }
function frasesExtras(cfg) {
  return String(cfg.frases_remover || '').split(/[\n,;]+/).map(function (s) { return s.trim(); }).filter(Boolean);
}
function rotaOpcoes(cfg) {
  let o = cfg && cfg.rota_opcoes;
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch (e) { o = {}; } }
  return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
}
function platsLigadas(cfg) {
  const op = rotaOpcoes(cfg);
  let lista = op.plataformas || cfg.plataformas;
  if (typeof lista === 'string') { try { lista = JSON.parse(lista); } catch (e) { lista = null; } }
  if (!Array.isArray(lista) || !lista.length) lista = ['mercadolivre'];
  const s = {};
  for (let i = 0; i < lista.length; i++) s[String(lista[i]).toLowerCase()] = true;
  return s;
}
function boolCampo(v, padrao) {
  if (v === true || v === 'true' || v === 1 || v === '1') return true;
  if (v === false || v === 'false' || v === 0 || v === '0') return false;
  return padrao;
}
function limparMarcasTerceiro(texto, extras) {
  const marcas = MARCAS_PADRAO.concat(extras).filter(Boolean);
  const unicas = [];
  for (let i = 0; i < marcas.length; i++) {
    const atual = marcas[i];
    if (!unicas.some(function (m) { return m.toLowerCase() === atual.toLowerCase(); })) unicas.push(atual);
  }
  return texto.split('\n').map(function (linha) {
    return linha.replace(/[_*]{1,2}(@[\w.]+)[_*]{1,2}/g, '$1');
  }).filter(function (linha) {
    const limpa = linha.replace(/[*_~`]/g, '').replace(/\s+/g, ' ').trim();
    if (!limpa) return true;
    if (/^@[\w.]+$/.test(limpa) || /^#[\w.]+$/.test(limpa)) return false;
    const lower = limpa.toLowerCase();
    for (let i = 0; i < unicas.length; i++) {
      const marca = unicas[i].toLowerCase();
      const semPrefixo = marca.replace(/^[@#]/, '');
      if (lower === marca || lower === semPrefixo) return false;
      if (lower.indexOf(marca) !== -1 && limpa.length <= marca.length + 8) return false;
    }
    return true;
  }).map(function (linha) {
    let t = linha;
    for (let i = 0; i < unicas.length; i++) t = t.replace(new RegExp(escaparRegExp(unicas[i]), 'gi'), '');
    return t.replace(/[ \t]+$/g, '');
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
function hashConteudo(material) {
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return ('00000000' + h.toString(16)).slice(-8) + '-' + material.length;
}

const norm = $('Normalizar Mensagem').first().json;
const cfg = $('Consultar Rota e Config').first().json;
const LIMITE_LEGENDA_TELEGRAM = limiteLegendaTelegram(cfg);
const extraidos = $('Extrair Links').first().json;
let pedidos = []; let hop1 = []; let hop2 = [];
try { pedidos = $('Separar Links a Resolver').all().map(function (i) { return i.json.url; }); } catch (e) { pedidos = []; }
try { hop1 = $('Seguir Redirecionamento 1').all().map(function (i) { return i.json; }); } catch (e) { hop1 = []; }
try { hop2 = $('Seguir Redirecionamento 2').all().map(function (i) { return i.json; }); } catch (e) { hop2 = []; }
function localizacao(resposta) {
  if (!resposta || !resposta.headers) return '';
  const valor = resposta.headers.location || resposta.headers.Location || '';
  return typeof valor === 'string' && /^https?:\/\//i.test(valor) ? valor : '';
}
const destinoFinal = {}; const htmlPorUrl = {};
for (let i = 0; i < pedidos.length; i++) {
  destinoFinal[pedidos[i]] = localizacao(hop2[i]) || localizacao(hop1[i]) || pedidos[i];
  htmlPorUrl[pedidos[i]] = String(
    (hop2[i] && (hop2[i].data || hop2[i].body))
    || (hop1[i] && (hop1[i].data || hop1[i].body))
    || '',
  );
}
const apelido = String(cfg.matt_word || '');
const etiqueta = String(cfg.matt_tool || '');
const plats = platsLigadas(cfg);
const opRota = rotaOpcoes(cfg);
const gerarImagem = boolCampo(opRota.gerar_imagem, true);
const gerarPreview = boolCampo(opRota.gerar_imagem_preview, false);
let texto = String(norm.texto || '');
let convertidos = 0;
let temOutroMarketplace = false;
const itemIds = [];
let tipoItem = '';
let tituloProduto = '';
let urlProdutoLimpa = '';
let urlAfiliadoLonga = '';
let urlAfiliadoCompacta = '';
const links = extraidos.links || [];
for (let i = 0; i < links.length; i++) {
  const link = links[i];
  if (link.tipo === 'convite') continue;
  const final = destinoFinal[link.url] || link.url;
  const hostFinal = hostDe(final);
  const veioDoMeli = terminaCom(hostFinal, DOMINIOS_ML) || terminaCom(hostDe(link.url), ENCURTADORES_ML);
  if (veioDoMeli && apelido && plats.mercadolivre) {
    const extra = permalinkDoHtml(htmlPorUrl[link.url] || '', norm.texto);
    const idNaUrl = ehVitrineSocial(final) ? '' : (itemIdDe(final) || itemIdDe(link.url));
    const id = idNaUrl || extra.id;
    if (id) {
      const urlProduto = idNaUrl ? String(final).split('#')[0].split('?')[0] : (extra.url || ('https://www.mercadolivre.com.br/MLB-' + String(id).replace(/^MLB/i, '')));
      const longa = montarLinkAfiliado(urlProduto, apelido, etiqueta);
      const compacta = montarLinkCompacto(urlProduto, id, apelido, etiqueta);
      texto = trocarTudo(texto, link.url, compacta);
      convertidos += 1;
      if (itemIds.indexOf(id) === -1) itemIds.push(id);
      if (!tipoItem) tipoItem = extra.tipo || tipoDeUrl(urlProduto);
      if (!urlProdutoLimpa) urlProdutoLimpa = String(urlProduto).split('#')[0].split('?')[0];
      if (!urlAfiliadoLonga) urlAfiliadoLonga = longa;
      if (!urlAfiliadoCompacta) urlAfiliadoCompacta = compacta;
      if (!tituloProduto && extra.titulo) tituloProduto = extra.titulo;
    } else {
      texto = trocarTudo(texto, link.url, montarLinkSocialProprio(apelido, etiqueta));
      convertidos += 1;
    }
  } else if (terminaCom(hostFinal, OUTROS_MARKETPLACES)) {
    temOutroMarketplace = true;
  }
}
texto = limparMarcasTerceiro(texto, frasesExtras(cfg));
const temConteudo = !!texto.trim() || norm.tem_imagem === true;
let publicar = temConteudo;
let status = publicar ? 'pendente' : 'descartado';
let motivo = '';
if (!temConteudo) motivo = 'sem_texto_nem_foto';
else if (convertidos > 0) motivo = 'copia_com_afiliado';
else if (temOutroMarketplace) motivo = 'copia_outro_marketplace';
else motivo = 'copia_identica';
const material = String(norm.chat_id || '') + '|' + String(norm.mensagem_id || '');
let destinos = [];
try { destinos = Array.isArray(cfg.destinos) ? cfg.destinos : JSON.parse(cfg.destinos || '[]'); } catch (e) { destinos = []; }
if (!destinos.length && cfg.destino) destinos = [{ plataforma: 'telegram', identificador: cfg.destino, nome: cfg.destino }];
const destinosTelegram = destinos.filter(function (d) { return d && d.plataforma === 'telegram' && d.identificador; });
const destinosWhatsapp = destinos.filter(function (d) { return d && d.plataforma === 'whatsapp' && d.identificador; });
const destinoTelegram = destinosTelegram.length ? destinosTelegram[0].identificador : (cfg.destino || '');
if (publicar && !destinosTelegram.length && !destinosWhatsapp.length) { publicar = false; status = 'descartado'; motivo = 'sem_destino_configurado'; }
const chaveMidia = { id: norm.mensagem_id, remoteJid: norm.chat_id, fromMe: norm.da_propria_conta === true };
if (norm.participante) chaveMidia.participant = norm.participante;
const urlFotoHtml = fotoDosHtmls(htmlPorUrl, itemIds.join(','));
function saida(urlVisivel, textoFinal, fonteLink) {
  return [{ json: {
    origem_chat_id: norm.chat_id, origem_nome: cfg.nome || '', origem_message_id: norm.mensagem_id,
    hash_conteudo: hashConteudo(material), texto_original: norm.texto, texto_publicado: textoFinal,
    links_convertidos: convertidos, item_ids: itemIds.join(','), tipo_item: tipoItem, titulo_produto: tituloProduto,
    url_produto: urlProdutoLimpa, url_afiliado: urlAfiliadoLonga || urlAfiliadoCompacta, url_visivel: urlVisivel,
    fonte_link: fonteLink, short_id: '', url_destino_curto: '', tem_imagem: norm.tem_imagem === true, url_foto_html: urlFotoHtml,
    gerar_imagem: gerarImagem, gerar_imagem_preview: gerarPreview,
    baixar_foto: gerarImagem && (norm.tem_imagem === true || !!urlFotoHtml),
    usar_foto: gerarImagem && (norm.tem_imagem === true || !!urlFotoHtml) && textoFinal.length <= LIMITE_LEGENDA_TELEGRAM,
    destino: destinoTelegram, destinos_telegram: destinosTelegram, destinos_whatsapp: destinosWhatsapp,
    tem_destino_telegram: destinosTelegram.length > 0, tem_destino_whatsapp: destinosWhatsapp.length > 0,
    delay_segundos: Number(cfg.delay_segundos || 8),
    url_midia: norm.servidor + '/chat/getBase64FromMediaMessage/' + norm.instancia,
    corpo_midia: JSON.stringify({ message: { key: chaveMidia }, convertToMp4: false }),
    publicar: publicar, status: status, motivo: motivo
  }}];
}
const permalinkAfiliado = urlAfiliadoCompacta || urlAfiliadoLonga;
const HOST_CURTO = 'https://srv1897392.hstgr.cloud/webhook/replica/s';
function aplicarCurto(urlCurta, fonteLink, extra) {
  let textoCurto = texto;
  if (urlAfiliadoCompacta) textoCurto = trocarTudo(textoCurto, urlAfiliadoCompacta, urlCurta);
  if (urlAfiliadoLonga) textoCurto = trocarTudo(textoCurto, urlAfiliadoLonga, urlCurta);
  const items = saida(urlCurta, textoCurto, fonteLink);
  if (extra) Object.assign(items[0].json, extra);
  return items;
}
if (!permalinkAfiliado) return saida('', texto, 'nenhum');
if (!urlProdutoLimpa || !apelido) return saida(permalinkAfiliado, texto, 'compacto');
const sid = idCurto();
return aplicarCurto(HOST_CURTO + '?id=' + sid, 'painel', { short_id: sid, url_destino_curto: permalinkAfiliado });
