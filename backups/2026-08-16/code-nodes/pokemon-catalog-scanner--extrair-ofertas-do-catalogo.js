// ===== Catalog Scanner: listagem lista.mercadolivre.com.br/loja/{slug}/pokemon =====
// Parser: _n.ctx.r= (JSON puro) -> appProps.pageProps.initialState.results[].polycard
// A homepage usa _n.ctx.s.q( — extrairPayloadLoja NAO serve aqui.
// Helpers de preco, afiliado, filtro e idioma iguais ao Store Scanner.

const AFILIADO_APELIDO = 'caed1312314';
const AFILIADO_TOOL_ID = '96097202';

function montarLinkAfiliado(urlProduto) {
  const limpa = String(urlProduto == null ? '' : urlProduto).split('#')[0].split('?')[0];
  if (!limpa) return '';
  return limpa + '?matt_word=' + AFILIADO_APELIDO + '&matt_tool=' + AFILIADO_TOOL_ID + '&forceInApp=true';
}

const BS = String.fromCharCode(92);
const RE_ACENTO = new RegExp('[' + String.fromCharCode(768) + '-' + String.fromCharCode(879) + ']', 'g');
const RE_LIXO = new RegExp('[^a-z0-9/ -]', 'g');
const RE_ESPACOS = new RegExp(' +', 'g');
const RE_CATALOGO = /\/p\/(ML[A-Z]?[0-9]+)/;

const PALAVRAS_RUIDO = ['pokemon','tcg','original','originais','oficial','lacrada','lacrado','lacradas','lacrados','nacional','portugues','copag','colecao','jogo','jogos','cartas','carta','em','de','da','do','dos','das','com','e','o','a','os','as','um','uma','para','novo','nova','produto','-'];

function bord(fonte) { return new RegExp(fonte.split('~').join(BS + 'b'), 'i'); }
function esc(s) { return String(s == null ? '' : s).split(String.fromCharCode(39)).join(String.fromCharCode(39) + String.fromCharCode(39)); }
function aspas(s) { return String.fromCharCode(39) + esc(s) + String.fromCharCode(39); }
function semAcento(s) { return String(s == null ? '' : s).normalize('NFD').replace(RE_ACENTO, ''); }
function norm(t) { return semAcento(t).toLowerCase().replace(RE_LIXO, ' ').replace(RE_ESPACOS, ' ').trim(); }
function num(v, padrao) { const n = parseFloat(v); return isNaN(n) ? padrao : n; }

function assinaturaTitulo(titulo) {
  const partes = norm(titulo).split(' ');
  const unicos = [];
  for (const p of partes) {
    if (!p) continue;
    if (PALAVRAS_RUIDO.indexOf(p) >= 0) continue;
    if (unicos.indexOf(p) < 0) unicos.push(p);
  }
  unicos.sort();
  return unicos.join(' ');
}

function catalogoDeLink(link) {
  const m = String(link == null ? '' : link).match(RE_CATALOGO);
  return m ? m[1] : '';
}

function addLista(mapa, chave, valor) {
  if (!chave) return;
  if (!mapa[chave]) mapa[chave] = [];
  mapa[chave].push(valor);
}

function acharOutro(mapa, chave, itemId, ignorar) {
  if (!chave) return null;
  const lista = mapa[chave] || [];
  for (const r of lista) {
    if (r.item_id === itemId) continue;
    if (ignorar && ignorar[r.item_id]) continue;
    return r;
  }
  return null;
}

const REGRAS_IDIOMA = [
  ['ja', bord('(japones|japonesa|japonesas|japoneses|japanese|~japan~)')],
  ['en', bord('(ingles|inglesa|~english~|~eng~|~ing~)')],
  ['pt', bord('(portugues|portuguesa|~nacional~|~ptbr~|~pt-br~|~pt br~|~copag~)')],
  ['ko', bord('(coreano|coreana|korean)')],
  ['zh', bord('(chines|chinesa|chinese)')]
];
const SINAIS_PT_PRODUTO = bord('(treinador avancado|deck de batalha|baralho de batalha|mega evolucao)');
const SINAIS_EN_PRODUTO = bord('(elite trainer box|~etb~|battle deck|mega evolution|pitch black)');

function detectarIdioma(titulo, searchTerm) {
  const n = norm(titulo);
  const achados = [];
  for (const regra of REGRAS_IDIOMA) {
    if (regra[1].test(n) && achados.indexOf(regra[0]) < 0) achados.push(regra[0]);
  }
  if (achados.length > 1) return { idioma: 'ambiguo', confianca: 0.4, candidatos: achados.slice().sort() };
  if (achados.length === 1) {
    const ultima = n.split(' ').pop() || '';
    let re = null;
    for (const regra of REGRAS_IDIOMA) if (regra[0] === achados[0]) re = regra[1];
    return { idioma: achados[0], confianca: re.test(ultima) ? 0.97 : 0.85 };
  }
  const temPt = SINAIS_PT_PRODUTO.test(n);
  const temEn = SINAIS_EN_PRODUTO.test(n);
  if (temPt && temEn) return { idioma: 'ambiguo', confianca: 0.4, candidatos: ['en', 'pt'] };
  if (temEn) return { idioma: 'en', confianca: 0.85 };
  if (temPt) return { idioma: 'pt', confianca: 0.85 };
  const loja = String(searchTerm || '').toLowerCase();
  if (loja.indexOf('loja:copag') === 0 || loja.indexOf('loja:pokemon') === 0) return { idioma: 'pt', confianca: 0.85 };
  return { idioma: 'desconhecido', confianca: 0 };
}

function extrairPayloadLista(html) {
  const marca = '_n.ctx.r=';
  const i = html.indexOf(marca);
  if (i < 0) return null;
  const s = html.indexOf('{', i);
  if (s < 0) return null;
  let depth = 0;
  let inStr = false;
  let escaped = false;
  for (let j = s; j < html.length; j++) {
    const ch = html[j];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === BS) escaped = true;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(html.slice(s, j + 1)); } catch (e) { return null; }
        }
      }
    }
  }
  return null;
}

function estadoLista(raiz) {
  const app = raiz && raiz.appProps ? raiz.appProps : {};
  const page = app.pageProps ? app.pageProps : {};
  return page.initialState ? page.initialState : {};
}

function coletarPolycardsLista(raiz) {
  const estado = estadoLista(raiz);
  const results = Array.isArray(estado.results) ? estado.results : [];
  const unicos = [];
  const vistos = {};
  for (const r of results) {
    const p = r && r.polycard ? r.polycard : null;
    if (!p || !p.metadata || !p.metadata.id) continue;
    const id = String(p.metadata.id);
    if (vistos[id]) continue;
    vistos[id] = 1;
    unicos.push(p);
  }
  return unicos;
}

function paginacaoLista(raiz) {
  const pag = estadoLista(raiz).pagination || {};
  const pageCount = pag.page_count != null ? Number(pag.page_count) : null;
  const resultsLimit = pag.results_limit != null ? Number(pag.results_limit) : null;
  return {
    page_count: (pageCount != null && !isNaN(pageCount)) ? pageCount : null,
    results_limit: (resultsLimit != null && !isNaN(resultsLimit)) ? resultsLimit : null
  };
}

function acharCtxPolycard(raiz) {
  let achado = null;
  function anda(n, d) {
    if (achado || !n || typeof n !== 'object' || d > 14) return;
    if (Array.isArray(n)) { for (const x of n) anda(x, d + 1); return; }
    if (n.polycard_context && n.polycard_context.picture_template) { achado = n.polycard_context; return; }
    for (const k of Object.keys(n)) anda(n[k], d + 1);
  }
  anda(raiz, 0);
  return achado;
}

function acharStorefront(raiz) {
  let achado = null;
  function anda(n, d) {
    if (achado || !n || typeof n !== 'object' || d > 14) return;
    if (Array.isArray(n)) { for (const x of n) anda(x, d + 1); return; }
    if (n.storefront && typeof n.storefront === 'object' && (n.storefront.subdomain || n.storefront.name)) { achado = n.storefront; return; }
    for (const k of Object.keys(n)) anda(n[k], d + 1);
  }
  anda(raiz, 0);
  return achado || {};
}

function comp(p, t) {
  const lista = p.components || [];
  for (const c of lista) if (c && c.type === t) return c;
  return null;
}

function montarThumb(template, picId) {
  if (!template || !picId) return '';
  return String(template).split('{square}').join('Q').split('{2x}').join('').split('{id}').join(picId).split('{size}').join('AB').split('{sanitized_title}').join('');
}

function idxPar(item, padrao) {
  const p = item.pairedItem;
  if (typeof p === 'number') return p;
  if (p && typeof p.item === 'number') return p.item;
  if (Array.isArray(p) && p.length && p[0] && typeof p[0].item === 'number') return p[0].item;
  return padrao;
}

function precoOriginalDoCard(precoObj) {
  if (precoObj.previous_price && precoObj.previous_price.value != null) {
    const v = Number(precoObj.previous_price.value);
    if (!isNaN(v) && v > 0) return v;
  }
  const rotulos = precoObj.price_labels || [];
  let achado = null;
  for (const lb of rotulos) {
    const valores = (lb && lb.values) || [];
    for (const v of valores) {
      if (!v || v.type !== 'price' || !v.price || !v.price.previous) continue;
      const bruto = v.price.previous;
      let cand = null;
      if (typeof bruto === 'number') cand = bruto;
      else if (bruto && bruto.value != null) cand = Number(bruto.value);
      else if (v.price.value != null) cand = Number(v.price.value);
      if (cand != null && !isNaN(cand) && cand > 0) achado = cand;
    }
  }
  return achado;
}

let existentes = [];
try { existentes = $('Buscar Promos Existentes').all(); } catch (e) { existentes = []; }

const bancoCatalogo = {};
const bancoAssinatura = {};
let linhasBanco = 0;
for (const r of existentes) {
  const j = (r && r.json) ? r.json : {};
  const iid = j.item_id ? String(j.item_id) : '';
  if (!iid) continue;
  linhasBanco++;
  const reg = { item_id: iid, status: j.status ? String(j.status) : '', origem: j.search_term ? String(j.search_term) : '' };
  addLista(bancoCatalogo, catalogoDeLink(j.permalink), reg);
  addLista(bancoAssinatura, assinaturaTitulo(j.title) + '|' + String(j.price_cents), reg);
}

const respostas = $input.all();
let linhasLojas = [];
try { linhasLojas = $('Filtrar Loja de Teste').all(); } catch (e) {
  try { linhasLojas = $('Buscar Lojas Ativas').all(); } catch (e2) { linhasLojas = []; }
}
const saida = [];
const candidatos = [];
const resumosDasLojas = [];

for (let i = 0; i < respostas.length; i++) {
  const resp = respostas[i];
  const linha = linhasLojas[idxPar(resp, i)] || linhasLojas[i] || null;
  const loja = linha ? linha.json : {};
  const slug = String(loja.slug || '');
  const nomeLoja = String(loja.nome || slug || 'desconhecida');
  const httpStatus = resp.json.statusCode == null ? null : Number(resp.json.statusCode);
  let html = '';
  if (typeof resp.json.body === 'string') html = resp.json.body;
  else if (typeof resp.json.data === 'string') html = resp.json.data;
  else if (resp.json.body != null) html = JSON.stringify(resp.json.body);

  const descMin = num(loja.desconto_minimo, 15);
  const precoMin = num(loja.preco_minimo, 0);
  const precoMax = (loja.preco_maximo == null || loja.preco_maximo === '') ? null : num(loja.preco_maximo, null);
  const filtroTxt = loja.filtro_titulo ? String(loja.filtro_titulo).trim() : '';
  const searchTerm = 'loja:' + slug + ':catalogo';

  let reFiltro = null;
  let erroLoja = null;
  if (filtroTxt) {
    try { reFiltro = new RegExp(filtroTxt, 'i'); }
    catch (e) { erroLoja = 'filtro_titulo invalido na loja ' + slug + ' (' + filtroTxt + '): ' + (e && e.message ? e.message : String(e)) + '. Varredura abortada para nao deixar passar produto fora do tema.'; }
  }

  let raiz = null;
  let pag = { page_count: null, results_limit: null };
  if (!erroLoja) {
    if (html.indexOf('suspicious-traffic') >= 0) {
      erroLoja = 'pagina de bloqueio suspicious-traffic na listagem da loja ' + slug + ' (HTTP ' + httpStatus + '): ScraperAPI nao conseguiu renderizar o catalogo';
    } else if (httpStatus != null && httpStatus !== 200) {
      erroLoja = 'HTTP ' + httpStatus + ' ao baixar o catalogo da loja ' + slug + ' via ScraperAPI (bloqueio, timeout ou slug invalido)';
    } else if (!html) {
      erroLoja = 'resposta vazia do ScraperAPI para o catalogo da loja ' + slug + ' (HTTP ' + httpStatus + ')';
    } else {
      raiz = extrairPayloadLista(html);
      if (!raiz) {
        erroLoja = html.indexOf('_n.ctx.r=') < 0
          ? 'payload _n.ctx.r ausente na listagem da loja ' + slug + ' (HTTP ' + httpStatus + '): layout do Mercado Livre mudou ou a pagina nao renderizou'
          : 'payload _n.ctx.r encontrado mas o JSON da listagem da loja ' + slug + ' nao pode ser decodificado (HTTP ' + httpStatus + ')';
      } else {
        pag = paginacaoLista(raiz);
      }
    }
  }

  function empurrarFalha(motivo, produtosTotal, idsLoja) {
    const ids = idsLoja || { official: 'NULL', owner: 'NULL', storefront: 'NULL' };
    const payloadErro = { motivo: motivo, loja: slug, origem: 'catalogo', http_status: httpStatus, produtos_encontrados: produtosTotal, page_count: pag.page_count, results_limit: pag.results_limit, html_length: html.length, html_snippet: String(html).slice(0, 600) };
    saida.push({ json: { decisao: 'erro_parser', slug: slug, error_msg: esc(String(motivo).slice(0, 400)), payload_json: esc(JSON.stringify(payloadErro)) } });
    saida.push({ json: { decisao: 'resumo', slug: slug, nome: nomeLoja, produtos_total: produtosTotal, passou_filtro: 0, com_oferta: 0, aceitos: 0, descartados: 0, duplicados: 0, barrados: 0, page_count: pag.page_count, results_limit: pag.results_limit, amostra_barrados: [], official_store_id_sql: ids.official, owner_id_sql: ids.owner, storefront_id_sql: ids.storefront, ultimo_erro_sql: aspas(String(motivo).slice(0, 400)), reason: esc(('catalogo ' + slug + ': varredura falhou - ' + motivo).slice(0, 500)) } });
  }

  if (erroLoja) {
    empurrarFalha(erroLoja, 0, null);
    continue;
  }

  const cards = coletarPolycardsLista(raiz);
  const ctx = acharCtxPolycard(raiz);
  const template = (ctx && ctx.picture_template) ? String(ctx.picture_template) : '';
  const sf = acharStorefront(raiz);
  const attrs = (sf.attributes && sf.attributes.brand_attributes) ? sf.attributes.brand_attributes : {};
  const officialStoreId = attrs.official_store_id != null ? Number(attrs.official_store_id) : null;
  const ownerId = sf.owner_id != null ? Number(sf.owner_id) : null;
  const subdominio = sf.subdomain ? String(sf.subdomain) : '';
  const idsLoja = {
    official: officialStoreId == null ? 'NULL' : String(officialStoreId),
    owner: ownerId == null ? 'NULL' : String(ownerId),
    storefront: subdominio ? aspas(subdominio) : 'NULL'
  };

  if (cards.length === 0) {
    empurrarFalha('catalogo da loja ' + slug + ' voltou com zero produtos na pagina 1 (HTTP ' + httpStatus + ', page_count=' + pag.page_count + ', results_limit=' + pag.results_limit + '): busca sem resultado, loja sem pokemon ou o layout mudou.', 0, idsLoja);
    continue;
  }

  let passouFiltro = 0;
  let comOferta = 0;
  let descartados = 0;
  let barrados = 0;
  const amostraBarrados = [];

  for (const p of cards) {
    const md = p.metadata || {};
    const id = md.id ? String(md.id) : '';
    if (!id) continue;
    const cTitulo = comp(p, 'title');
    const titulo = (cTitulo && cTitulo.title && cTitulo.title.text) ? String(cTitulo.title.text) : '';
    const cPreco = comp(p, 'price');
    const precoObj = (cPreco && cPreco.price) ? cPreco.price : {};
    const preco = (precoObj.current_price && precoObj.current_price.value != null) ? Number(precoObj.current_price.value) : null;
    const precoOrig = precoOriginalDoCard(precoObj);
    const rotuloDesc = (precoObj.discount_label && precoObj.discount_label.text) ? String(precoObj.discount_label.text) : '';
    const freteGratis = !!(comp(p, 'shipping') || comp(p, 'shipping_v2'));
    const pics = (p.pictures && p.pictures.pictures) ? p.pictures.pictures : [];
    const picId = (pics.length && pics[0]) ? pics[0].id : null;
    const thumb = montarThumb(template, picId);
    const urlBruta = md.url ? String(md.url) : '';
    const linkCompleto = urlBruta ? ((urlBruta.indexOf('http') === 0 ? urlBruta : ('https://' + urlBruta)) + (md.url_params ? String(md.url_params) : '')) : '';
    const linkLimpo = linkCompleto ? linkCompleto.split('#')[0].split('?')[0] : '';
    const utm = montarLinkAfiliado(linkLimpo);
    const idi = detectarIdioma(titulo, searchTerm);
    const catalogo = md.product_id ? String(md.product_id) : catalogoDeLink(linkLimpo);

    if (reFiltro && !(reFiltro.test(titulo) || reFiltro.test(norm(titulo)))) {
      barrados++;
      if (amostraBarrados.length < 8) amostraBarrados.push(titulo.slice(0, 60));
      saida.push({ json: { decisao: 'fora_do_filtro', slug: slug, item_id: id, title: titulo, motivo: 'titulo fora do filtro da loja (' + filtroTxt + ')' } });
      continue;
    }
    passouFiltro++;

    if (!preco || !(preco > 0)) {
      saida.push({ json: { decisao: 'sem_oferta', slug: slug, item_id: id, title: titulo, motivo: 'card sem preco atual legivel' } });
      continue;
    }
    if (precoOrig == null || !(precoOrig > preco)) {
      saida.push({ json: { decisao: 'sem_oferta', slug: slug, item_id: id, title: titulo, preco: preco, motivo: 'sem preco original: produto nao esta em oferta' } });
      continue;
    }
    comOferta++;

    const desconto = Math.round(((precoOrig - preco) / precoOrig) * 10000) / 100;
    const precoCents = Math.round(preco * 100);
    const origCents = Math.round(precoOrig * 100);
    const resumoPreco = 'de R$ ' + precoOrig.toFixed(2) + ' por R$ ' + preco.toFixed(2);
    const base = 'catalogo ' + slug + ' | ' + resumoPreco + ' | desconto ' + desconto.toFixed(2) + '% (minimo ' + descMin + '%)' + (rotuloDesc ? ' | rotulo ' + rotuloDesc : '') + ' | idioma ' + idi.idioma + ' (' + idi.confianca + ')' + (catalogo ? ' | catalogo ' + catalogo : '') + (freteGratis ? ' | frete gratis' : '');

    let motivoDescarte = null;
    if (desconto < descMin) motivoDescarte = 'desconto abaixo do minimo da loja';
    else if (desconto >= 95) motivoDescarte = 'desconto de ' + desconto + '% implausivel, provavel erro de leitura de preco';
    else if (preco < precoMin) motivoDescarte = 'preco abaixo do minimo configurado para a loja';
    else if (precoMax != null && preco > precoMax) motivoDescarte = 'preco acima do maximo configurado para a loja';

    if (motivoDescarte) {
      descartados++;
      saida.push({ json: { decisao: 'descartado', slug: slug, item_id: id, title: esc(titulo.slice(0, 300)), title_bruto: titulo, reason: esc((base + ' | descartado: ' + motivoDescarte).slice(0, 500)) } });
      continue;
    }

    candidatos.push({
      item_id: id,
      slug: slug,
      catalogo: catalogo,
      assinatura: assinaturaTitulo(titulo),
      price_cents: precoCents,
      title_esc: esc(titulo.slice(0, 300)),
      title_bruto: titulo,
      base: base,
      json: {
        decisao: 'aceito',
        slug: slug,
        loja_nome: nomeLoja,
        loja_slug: slug,
        item_id: id,
        title: esc(titulo.slice(0, 300)),
        title_bruto: titulo,
        price_cents: precoCents,
        original_price_cents: origCents,
        discount_pct: desconto,
        preco_de: precoOrig,
        preco_por: preco,
        seller_reputation_sql: 'NULL',
        seller_sales_sql: 'NULL',
        category_id_sql: 'NULL',
        thumbnail: esc(thumb),
        permalink: esc(linkLimpo),
        utm_link: esc(utm),
        utm_link_bruto: utm,
        search_term: searchTerm,
        idioma: idi.idioma,
        idioma_confianca: idi.confianca,
        idioma_sql: aspas(idi.idioma),
        idioma_confianca_sql: String(idi.confianca),
        produto_catalogo: catalogo,
        frete_gratis: freteGratis,
        assinatura_produto: assinaturaTitulo(titulo),
        reason: esc(('aceito | ' + base).slice(0, 500)),
        payload_erro: esc(JSON.stringify({ item_id: id, title: titulo, price_cents: precoCents, discount_pct: desconto, permalink: linkLimpo, loja: slug, origem: 'catalogo' }))
      }
    });
  }

  resumosDasLojas.push({
    slug: slug,
    nome: nomeLoja,
    produtos_total: cards.length,
    passou_filtro: passouFiltro,
    com_oferta: comOferta,
    descartados: descartados,
    barrados: barrados,
    amostra_barrados: amostraBarrados,
    page_count: pag.page_count,
    results_limit: pag.results_limit,
    ids: idsLoja
  });
}

const idsDaVarredura = {};
for (const c of candidatos) idsDaVarredura[c.item_id] = 1;

const comCatalogo = [];
const semCatalogo = [];
for (const c of candidatos) { if (c.catalogo) comCatalogo.push(c); else semCatalogo.push(c); }
const ordenados = comCatalogo.concat(semCatalogo);

const vistoCatalogo = {};
const vistoAssinatura = {};
const aceitosPorLoja = {};
const duplicadosPorLoja = {};

for (const c of ordenados) {
  const chaveAss = c.assinatura + '|' + String(c.price_cents);
  let mantido = null;
  let criterio = '';

  if (c.catalogo && vistoCatalogo[c.catalogo]) {
    mantido = vistoCatalogo[c.catalogo].item_id;
    criterio = 'mesmo product_id de catalogo (' + c.catalogo + ') ja aceito nesta varredura, na loja ' + vistoCatalogo[c.catalogo].slug;
  } else {
    const noBancoCat = acharOutro(bancoCatalogo, c.catalogo, c.item_id, idsDaVarredura);
    if (noBancoCat) {
      mantido = noBancoCat.item_id;
      criterio = 'mesmo product_id de catalogo (' + c.catalogo + ') de item ja gravado em promos' + (noBancoCat.origem ? ' (' + noBancoCat.origem + ')' : '');
    } else if (vistoAssinatura[chaveAss]) {
      mantido = vistoAssinatura[chaveAss].item_id;
      criterio = 'titulo normalizado + preco iguais aos de item ja aceito nesta varredura, na loja ' + vistoAssinatura[chaveAss].slug + ' (assinatura: ' + c.assinatura + ')';
    } else {
      const noBancoAss = acharOutro(bancoAssinatura, chaveAss, c.item_id, idsDaVarredura);
      if (noBancoAss) {
        mantido = noBancoAss.item_id;
        criterio = 'titulo normalizado + preco iguais aos de item ja gravado em promos' + (noBancoAss.origem ? ' (' + noBancoAss.origem + ')' : '') + ' (assinatura: ' + c.assinatura + ')';
      }
    }
  }

  if (mantido) {
    duplicadosPorLoja[c.slug] = (duplicadosPorLoja[c.slug] || 0) + 1;
    saida.push({ json: {
      decisao: 'descartado',
      slug: c.slug,
      item_id: c.item_id,
      title: c.title_esc,
      title_bruto: c.title_bruto,
      duplicata_de: mantido,
      criterio_duplicata: criterio,
      reason: esc(('duplicata de produto: mantido ' + mantido + ' | criterio: ' + criterio + ' | ' + c.base).slice(0, 500))
    } });
    continue;
  }

  if (c.catalogo) vistoCatalogo[c.catalogo] = { item_id: c.item_id, slug: c.slug };
  vistoAssinatura[chaveAss] = { item_id: c.item_id, slug: c.slug };
  aceitosPorLoja[c.slug] = (aceitosPorLoja[c.slug] || 0) + 1;
  saida.push({ json: c.json });
}

for (const r of resumosDasLojas) {
  const aceitos = aceitosPorLoja[r.slug] || 0;
  const duplicados = duplicadosPorLoja[r.slug] || 0;
  const pagTxt = 'page_count=' + r.page_count + ' results_limit=' + r.results_limit + ' (so pagina 1 nesta versao)';
  const resumoTexto = 'catalogo ' + r.slug + ': ' + r.produtos_total + ' produtos na pagina 1, ' + r.passou_filtro + ' passaram no filtro de titulo, ' + r.com_oferta + ' com preco de/por, ' + aceitos + ' aceitos, ' + r.descartados + ' descartados por regra de preco, ' + duplicados + ' duplicatas de produto, ' + r.barrados + ' barrados pelo filtro, ' + pagTxt + ' (dedup comparou com ' + linhasBanco + ' linhas de promos)' + (r.amostra_barrados.length ? ' | exemplos barrados: ' + r.amostra_barrados.join(' ; ') : '');

  saida.push({ json: {
    decisao: 'resumo',
    slug: r.slug,
    nome: r.nome,
    produtos_total: r.produtos_total,
    passou_filtro: r.passou_filtro,
    com_oferta: r.com_oferta,
    aceitos: aceitos,
    descartados: r.descartados,
    duplicados: duplicados,
    barrados: r.barrados,
    page_count: r.page_count,
    results_limit: r.results_limit,
    amostra_barrados: r.amostra_barrados,
    promos_comparadas: linhasBanco,
    official_store_id_sql: r.ids.official,
    owner_id_sql: r.ids.owner,
    storefront_id_sql: r.ids.storefront,
    ultimo_erro_sql: 'NULL',
    reason: esc(resumoTexto.slice(0, 500))
  } });
}

if (saida.length === 0) {
  const motivo = 'nenhuma loja ativa devolveu resposta no catalogo: verifique Filtrar Loja de Teste e lojas_confiaveis';
  saida.push({ json: { decisao: 'erro_parser', slug: '', error_msg: esc(motivo), payload_json: esc(JSON.stringify({ motivo: motivo, respostas: respostas.length })) } });
}

return saida;
