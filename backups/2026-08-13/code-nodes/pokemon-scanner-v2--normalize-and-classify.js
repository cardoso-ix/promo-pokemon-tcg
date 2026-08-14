// Pokemon Scanner v2 > node "Normalize and Classify"
// Backup de 13/08/2026. Nao e executado daqui: a fonte de verdade e o n8n.

const raw = $input.first().json.data || $input.first().json.body || '';
const html = typeof raw === 'string' ? raw : JSON.stringify(raw);

const ML_MIN = 15;
const ML_MAX = 60;
// ===== Link de afiliado =====
// Conferido em 13/08/2026 contra dois links reais do painel do Eduardo.
// matt_word = apelido da conta de afiliado; matt_tool = ID numerico da etiqueta.
// O painel gera /social/<apelido>?...&ref=<token assinado>, e esse token nao pode
// ser produzido fora do painel. Detalhes em docs/regras-de-negocio.md, secao 10.
const AFILIADO_APELIDO = 'caed1312314';
const AFILIADO_TOOL_ID = '96097202';

function montarLinkAfiliado(urlProduto) {
  const limpa = String(urlProduto == null ? '' : urlProduto).split('#')[0].split('?')[0];
  if (!limpa) return '';
  return limpa + '?matt_word=' + AFILIADO_APELIDO + '&matt_tool=' + AFILIADO_TOOL_ID + '&forceInApp=true';
}

// Cartas Colecionaveis T.C.G. A URL de ofertas ja filtra a categoria no servidor,
// entao nao ha filtro de categoria nem de palavra-chave aqui.
const CATEGORY = 'MLB6899';
const SEARCH_TERM = 'ofertas MLB6899';

// ===== Limiares do filtro de autenticidade =====
const AUTH_BLOCK = -40;   // score <= -40  -> bloqueado como suspeita de falsificacao
const AUTH_ACCEPT = 25;   // score >= +25  -> aceito; entre os dois -> revisao humana
const POS_KW_CAP = 55;    // teto dos sinais positivos de titulo (anti keyword stuffing)

const esc = (s) => String(s == null ? '' : s).replace(/'/g, "''");
// remove acentos e caixa alta para que os regex sejam simples e tolerantes
const norm = (s) => String(s == null ? '' : s).toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ===== Idioma da carta =====
// O Mercado Livre monta o titulo da pagina de ofertas anexando o idioma no fim.
// Quando o termo aparece como ultima palavra a deteccao e quase certa (0.97);
// no meio do titulo vale menos (0.85). Dois idiomas no mesmo titulo viram
// 'ambiguo' e o Publisher omite a linha - melhor calar do que errar.
const normIdioma = (t) => norm(t).replace(/[^a-z0-9/\- ]/g, ' ').replace(/\s+/g, ' ').trim();

const REGRAS_IDIOMA = [
  ['ja', /(japones|japonesa|japonesas|japoneses|japanese|\bjapan\b)/],
  ['en', /(ingles|inglesa|\benglish\b|\beng\b)/],
  ['pt', /(portugues|portuguesa|\bnacional\b|\bptbr\b|\bcopag\b)/],
  ['ko', /(coreano|coreana|korean)/],
  ['zh', /(chines|chinesa|chinese)/]
];

function detectarIdioma(titulo) {
  const n = normIdioma(titulo);
  const achados = [];
  for (const r of REGRAS_IDIOMA) if (r[1].test(n) && achados.indexOf(r[0]) < 0) achados.push(r[0]);
  if (achados.length === 0) return { idioma: 'desconhecido', confianca: 0 };
  if (achados.length > 1) return { idioma: 'ambiguo', confianca: 0.4 };
  const ultima = n.split(' ').pop() || '';
  let re = null;
  for (const r of REGRAS_IDIOMA) if (r[0] === achados[0]) re = r[1];
  return { idioma: achados[0], confianca: re.test(ultima) ? 0.97 : 0.85 };
}

// ===== Lista de bloqueio de vendedores =====
// Vem da tabela vendedores_bloqueados, carregada pelo node "Load Seller Blocklist".
// E lista de BLOQUEIO apenas: nome de vendedor NUNCA soma ponto de autenticidade e
// nao estar na lista nao e sinal a favor de nada.
const normNome = (s) => norm(s).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const BLOQUEADOS = [];
try {
  const bl = $('Load Seller Blocklist').first().json.bloqueados;
  const arr = Array.isArray(bl) ? bl : (typeof bl === 'string' ? JSON.parse(bl) : []);
  for (const nome of (arr || [])) {
    const k = normNome(nome);
    if (k && BLOQUEADOS.indexOf(k) < 0) BLOQUEADOS.push(k);
  }
} catch (e) { /* banco indisponivel: varre sem bloquear por vendedor */ }

// Termos em que o proprio anuncio admite nao ser produto licenciado.
const HARD_FAKE = [
  [/\breplicas?\b/, 'replica'],
  [/\bproxys?\b|\bproxies\b/, 'proxy'],
  [/\boricas?\b/, 'orica'],
  [/\bfan\s?made\b/, 'fan made'],
  [/\bcustom\b|\bcustomizad[oa]s?\b/, 'custom'],
  [/\bpersonalizad[oa]s?\b/, 'personalizada'],
  [/\bartesanal\b|\bartesanais\b/, 'artesanal'],
  [/\bhand\s?made\b/, 'handmade'],
  [/\bnao\s+(oficial|licenciad|original|autentic)/, 'nao oficial'],
  [/\bsem\s+licenc/, 'sem licenca'],
  [/\bgeneric[oa]s?\b/, 'generica'],
  [/\binspirad[oa]s?\b/, 'inspirado em'],
  [/\bsimilar(es)?\b/, 'similar'],
  [/\bestilo\s+pokemon\b/, 'estilo pokemon'],
  [/\bimitac(ao|oes)\b/, 'imitacao'],
  [/\bcopias?\b/, 'copia'],
  [/\bversao\s+alternativa\b/, 'versao alternativa'],
  [/\bimpress[ao]\s+(propria|caseira)\b/, 'impressao caseira'],
  [/\bfeit[oa]s?\s+a\s+mao\b/, 'feito a mao'],
  [/\bdiy\b/, 'DIY'],
  [/\bnao\s+e\s+original\b/, 'nao e original'],
  [/\bpaper\s+card\b/, 'paper card']
];

// "Cartas gold/douradas/metalizadas" nao existem como linha oficial vendida a granel no Brasil.
const METAL_FAKE = [
  [/\bgold\b/, 'gold'],
  [/\bdourad[oa]s?\b/, 'dourada'],
  [/\bmetalizad[oa]s?\b/, 'metalizada'],
  [/\bmetalic[oa]s?\b/, 'metalica'],
  [/\bpratead[oa]s?\b/, 'prateada'],
  [/\bbanhad[oa]s?\b/, 'banhada'],
  [/\bcartas?\s+de\s+metal\b/, 'carta de metal'],
  [/\bmetal\s+cards?\b/, 'metal card']
];

// Chamarizes de raridade. So pontuam contra quando aparecem em contexto de lote.
const HYPE_HIGH = [
  [/\bultra\s+rara?s?\b/, 'ultra rara'],
  [/\bhiper\s+rara?s?\b/, 'hiper rara'],
  [/\bsecreta?s?\b|\bsecret\s+rare\b/, 'secreta'],
  [/\brainbow\b/, 'rainbow'],
  [/\barco[\s-]?iris\b/, 'arco iris'],
  [/\bshiny\b/, 'shiny']
];

const HYPE_MED = [
  [/\bbrilhante?s?\b/, 'brilhante'],
  [/\bholografic[oa]s?\b|\bholo\b/, 'holografica'],
  [/\bcromad[oa]s?\b/, 'cromada']
];

// ===== Sinais positivos =====
// REGRA DURA: nada AUTODECLARADO pelo anunciante pode somar ponto aqui.
// A marca do anuncio ("POKEMON") e escolhida por quem anuncia, e o selo
// "Loja oficial" do Mercado Livre significa apenas que aquele vendedor tem uma
// loja oficial na plataforma - NAO que seja a loja oficial da Pokemon. Foram
// encontrados anuncios de carta Pokemon com marca POKEMON e selo "Loja oficial"
// pertencendo a "Lehadry Joias" e a "Vikn Comercio de Auto Pecas".
// Por isso "original", "oficial", "licenciado", "autentico" e "selo" no titulo
// nao valem mais ponto nenhum: falsificador escreve todas essas palavras.
// Nenhum campo brand / official_store / seller entra no score.
const POS_KW = [
  [/\bcopag\b/, 45, 'Copag, distribuidora licenciada no Brasil'],
  [/\blacrad[oa]s?\b|\bselad[oa]s?\b|\blacre\b/, 25, 'produto lacrado'],
  [/\bbooster\s+box\b|\bbooster\s+pack\b|\bbooster\b|\bblister\b|\belite\s+trainer\s+box\b|\betb\b|\btrainer\s+box\b|\bcolecao\s+(especial|premium)\b|\bpremium\s+collection\b|\blatas?\b|\btins?\b|\bdeck\b|\bbaralho\b/, 25, 'linha selada oficial'],
  [/\bportugues\b|\bnacional\b|\bpt-?br\b/, 12, 'versao nacional em portugues'],
  [/\bnm\b|\bnear\s+mint\b|\bmint\b|\bpsa\b|\bbgs\b|\bcgc\b/, 8, 'vocabulario de colecionador'],
  [/\bnota\s+fiscal\b|\bnf-?e\b/, 5, 'emite nota fiscal']
];

// Quantidade declarada no titulo ("kit 5 cartas", "lote 20 cartas", "100 cartas").
function extractQty(t) {
  let q = null;
  const pats = [
    /\b(\d{1,4})\s*(?:un(?:idades?)?\.?\s*)?cartas?\b/,
    /\b(?:kit|lote|combo|conjunto|pacote|pack)\s*(?:com\s*)?(\d{1,4})\b/,
    /\b(\d{1,4})\s*(?:pcs|pecas)\b/
  ];
  for (const p of pats) {
    const m = t.match(p);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 2 && n <= 5000) q = (q == null) ? n : Math.max(q, n);
    }
  }
  return q;
}

function qtyPenalty(q) {
  if (q == null) return 0;
  if (q >= 100) return 40;
  if (q >= 50) return 30;
  if (q >= 30) return 25;
  if (q >= 10) return 12;
  if (q >= 5) return 5;
  return 3;
}

// Score combinado. Positivos de titulo tem teto porque vendedor de falsificado
// tambem escreve palavra bonita no anuncio.
function authenticity(rawTitle, priceReais, ratingKnown, rating, sales, idioma) {
  const t = norm(rawTitle);
  const negWhy = [];
  const posWhy = [];
  let neg = 0;
  let posKw = 0;
  let posSeller = 0;

  for (const rule of HARD_FAKE) {
    if (rule[0].test(t)) {
      neg -= 150;
      negWhy.push('termo explicito de produto nao original: "' + rule[1] + '"');
      break;
    }
  }

  // Metal/dourado so vale como sinal de falsificacao se o anuncio for mesmo de carta.
  const isCard = /\bcarta|\bcard|pokemon/.test(t);
  let metal = null;
  if (isCard) {
    for (const rule of METAL_FAKE) {
      if (rule[0].test(t)) { metal = rule[1]; break; }
    }
  }
  if (metal) {
    neg -= 30;
    negWhy.push('carta "' + metal + '" nao corresponde a linha oficial do Pokemon TCG');
  }

  const qty = extractQty(t);
  if (qty != null) {
    const qp = qtyPenalty(qty);
    neg -= qp;
    negWhy.push('lote de ' + qty + ' cartas');
  }

  let unitPrice = null;
  if (qty != null && qty >= 2 && priceReais > 0) unitPrice = priceReais / qty;

  const hypeHits = [];
  for (const rule of HYPE_HIGH) if (rule[0].test(t)) hypeHits.push({ w: 25, label: rule[1] });
  for (const rule of HYPE_MED) if (rule[0].test(t)) hypeHits.push({ w: 15, label: rule[1] });
  hypeHits.sort((a, b) => b.w - a.w);
  if (qty != null && qty >= 2 && hypeHits.length > 0) {
    let hp = hypeHits[0].w + (hypeHits.length - 1) * 10;
    if (hp > 45) hp = 45;
    neg -= hp;
    negWhy.push('chamariz de raridade em lote: ' + hypeHits.map(h => h.label).join(' + '));
  }

  // Preco por carta: chamariz de raridade alta a poucos reais nao existe no mercado real.
  const highHype = hypeHits.some(h => h.w === 25) || !!metal;
  if (unitPrice != null) {
    if (highHype && unitPrice < 15) {
      neg -= 35;
      negWhy.push('preco por carta implausivel: R$ ' + unitPrice.toFixed(2) + ' para carta anunciada como rara');
    } else if (unitPrice < 1) {
      neg -= 10;
      negWhy.push('preco por carta de R$ ' + unitPrice.toFixed(2) + ', volume sem valor colecionavel');
    }
  }

  // IDIOMA NUNCA PENALIZA SOZINHO. Carta japonesa legitima existe e e valorizada
  // por colecionador - varias sao mais caras que a versao ocidental. A suspeita so
  // nasce da COMBINACAO de lote grande (>=10 cartas) com preco unitario implausivel
  // (< R$ 5 por carta), que e o padrao das replicas vendidas a granel.
  if (idioma === 'ja' && qty != null && qty >= 10 && unitPrice != null && unitPrice < 5) {
    neg -= 25;
    negWhy.push('lote grande de ' + qty + ' cartas japonesas a R$ ' + unitPrice.toFixed(2) + ' por carta');
  }

  for (const rule of POS_KW) {
    if (rule[0].test(t)) { posKw += rule[1]; posWhy.push(rule[2]); }
  }
  if (posKw > POS_KW_CAP) posKw = POS_KW_CAP;

  if (!ratingKnown) {
    posSeller -= 6;
    negWhy.push('vendedor sem reputacao publicada');
  } else if (rating >= 4.8) {
    posSeller += 10;
    posWhy.push('reputacao do vendedor ' + rating);
  } else if (rating >= 4.5) {
    posSeller += 5;
    posWhy.push('reputacao do vendedor ' + rating);
  } else if (rating < 4.0) {
    posSeller -= 12;
    negWhy.push('reputacao baixa do vendedor: ' + rating);
  }

  if (sales >= 1000) { posSeller += 10; posWhy.push('mais de 1000 vendas'); }
  else if (sales >= 500) { posSeller += 6; posWhy.push('mais de 500 vendas'); }
  else if (sales >= 100) { posSeller += 3; posWhy.push('mais de 100 vendas'); }
  else { posSeller -= 10; negWhy.push('vendedor com apenas ' + sales + ' vendas registradas'); }

  const score = Math.round(posKw + posSeller + neg);
  const level = score <= AUTH_BLOCK ? 'suspeito' : (score >= AUTH_ACCEPT ? 'confiavel' : 'duvidoso');
  const parts = [];
  if (negWhy.length) parts.push('contra: ' + negWhy.join('; '));
  if (posWhy.length) parts.push('a favor: ' + posWhy.join('; '));

  return {
    score: score,
    level: level,
    qty: qty,
    unit_price: unitPrice == null ? null : Math.round(unitPrice * 100) / 100,
    detail: parts.join(' | ') || 'nenhum sinal relevante no titulo'
  };
}

// ===== Estrategia 0 (prioritaria): _n.ctx.r dentro de __NORDIC_RENDERING_CTX__ =====
function extractCtx(h) {
  const i = h.indexOf('_n.ctx.r=');
  if (i < 0) return null;
  const s = h.indexOf('{', i);
  if (s < 0) return null;
  let depth = 0, inStr = false, escaped = false;
  for (let j = s; j < h.length; j++) {
    const ch = h[j];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) return h.slice(s, j + 1); }
    }
  }
  return null;
}

function findContainer(o, d) {
  if (!o || d > 8 || typeof o !== 'object') return null;
  if (Array.isArray(o.items) && o.items.length && o.items[0] && o.items[0].card) return o;
  for (const k of Object.keys(o)) { const r = findContainer(o[k], d + 1); if (r) return r; }
  return null;
}

function comp(card, type) {
  return (card.components || []).find(c => c && c.type === type)
    || (card.widget_components || []).find(c => c && c.type === type);
}

// A pagina de ofertas nao traz seller_reputation estruturado como a API antiga.
// O componente review_compacted traz nota e volume de vendas em TEXTO.
function parseReview(card) {
  const out = { rating: null, sales: 0 };
  const rc = comp(card, 'review_compacted');
  if (!rc) return out;
  let blob = '';
  try { blob = JSON.stringify(rc); } catch (e) { return out; }

  const pats = [
    /"rating"\s*:\s*"?([0-5](?:[.,]\d+)?)"?/i,
    /"(?:label|text|value)"\s*:\s*"([0-5](?:[.,]\d)?)"/,
    /"([0-5][.,]\d)"/
  ];
  for (const p of pats) {
    const m = blob.match(p);
    if (m) {
      const v = parseFloat(String(m[1]).replace(',', '.'));
      if (!isNaN(v) && v >= 0 && v <= 5) { out.rating = v; break; }
    }
  }

  const ms = blob.match(/\+?\s*([\d.]+)\s*(mil|mi)?\s*vendid/i);
  if (ms) {
    let n = parseFloat(String(ms[1]).replace(/\./g, ''));
    if (!isNaN(n)) {
      const unit = String(ms[2] || '').toLowerCase();
      if (unit === 'mil') n = n * 1000;
      else if (unit === 'mi') n = n * 1000000;
      out.sales = Math.round(n);
    }
  }
  return out;
}

// Nome do vendedor. Vem no componente "seller", no formato
// "{marca} por {Nome do Vendedor} {icone}". So ~3% dos anuncios expoem isso,
// mas quando expoem e o unico jeito de aplicar a lista de bloqueio.
// A marca que vem antes do "por" e AUTODECLARADA e nao e usada para nada.
function parseSeller(card) {
  const sc = comp(card, 'seller');
  if (!sc) return '';
  let txt = '';
  if (sc.seller && typeof sc.seller.text === 'string') txt = sc.seller.text;
  if (!txt) {
    try {
      const m = JSON.stringify(sc).match(/"text"\s*:\s*"([^"]{2,120})"/);
      if (m) txt = m[1];
    } catch (e) { return ''; }
  }
  if (!txt) return '';
  const low = String(txt).toLowerCase();
  const i = low.indexOf(' por ');
  let nome = i >= 0 ? String(txt).slice(i + 5) : String(txt);
  nome = nome.replace(/[^0-9A-Za-z\u00C0-\u00FF&.,'\- ]/g, ' ').replace(/\s+/g, ' ').trim();
  return nome.slice(0, 120);
}

function normalizeNordic(it) {
  const card = (it && it.card) || {};
  const md = card.metadata || {};
  const t = comp(card, 'title');
  const p = comp(card, 'price');
  const price = (p && p.price && p.price.current_price) ? p.price.current_price.value : null;
  let prev = null;
  const labels = (p && p.price && p.price.price_labels) || [];
  for (const lb of labels) {
    for (const v of ((lb && lb.values) || [])) {
      if (v && v.type === 'price' && v.price) prev = v.price.value;
    }
  }
  const pics = (card.pictures && card.pictures.pictures) || [];
  const picId = pics[0] ? pics[0].id : null;
  const url = md.url ? String(md.url) : '';
  const rev = parseReview(card);
  return {
    id: md.id,
    title: (t && t.title && t.title.text) || '',
    price: price,
    original_price: prev || price,
    permalink: url ? (url.indexOf('http') === 0 ? url : 'https://' + url) : '',
    thumbnail: picId ? 'https://http2.mlstatic.com/D_NQ_NP_' + picId + '-O.webp' : '',
    category_id: CATEGORY,
    _rating: rev.rating,
    _sales: rev.sales,
    _vendedor: parseSeller(card)
  };
}

let items = [];
let source = '';
let parseErr = null;
const antiBot = html.indexOf('suspicious-traffic') >= 0;

if (!antiBot) {
  try {
    const blob = extractCtx(html);
    if (!blob) {
      parseErr = '_n.ctx.r nao encontrado no HTML (formato da pagina de ofertas mudou?)';
    } else {
      const container = findContainer(JSON.parse(blob), 0);
      if (!container) {
        parseErr = 'container de cards nao encontrado dentro de _n.ctx.r';
      } else {
        items = container.items.map(normalizeNordic).filter(x => x && x.id);
        source = 'nordic';
      }
    }
  } catch (e) {
    parseErr = 'falha ao parsear _n.ctx.r: ' + (e && e.message ? e.message : String(e));
  }
}

// ===== Fallbacks legados (pagina de busca / API) =====
if (!antiBot && items.length === 0) {
  try {
    const stateMatch = html.match(/__PRELOADED_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/);
    if (stateMatch) {
      const state = JSON.parse(stateMatch[1]);
      const results = state?.initialState?.results || state?.results || [];
      if (Array.isArray(results) && results.length > 0) { items = results; source = 'preloaded_state'; }
    }
  } catch(e) {}
}

if (!antiBot && items.length === 0) {
  try {
    const ldMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    if (ldMatches) {
      for (const m of ldMatches) {
        const jsonStr = m.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        const parsed = JSON.parse(jsonStr);
        if (parsed['@type'] === 'ItemList' && parsed.itemListElement) {
          items = parsed.itemListElement.map(i => i.item || i); source = 'ld_json'; break;
        }
        if (Array.isArray(parsed)) { items = parsed; source = 'ld_json'; break; }
      }
    }
  } catch(e) {}
}

if (!antiBot && items.length === 0) {
  try {
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
    for (const s of scriptMatches) {
      const content = s.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim();
      if (content.includes('"results"') && content.includes('"price"')) {
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          try {
            const obj = JSON.parse(content.substring(jsonStart, jsonEnd + 1));
            const found = obj.results || obj.data?.results || obj.initialProps?.pageProps?.results || [];
            if (Array.isArray(found) && found.length > 0) { items = found; source = 'script_json'; break; }
          } catch(e2) {}
        }
      }
    }
  } catch(e) {}
}

if (!antiBot && items.length === 0) {
  try {
    const cardPattern = /class="[^"]*ui-search-result[^"]*"[\s\S]*?<a[^>]*href="(https:\/\/[^"]+)"[\s\S]*?<span[^>]*class="[^"]*price-tag-fraction[^"]*"[^>]*>(\d[\d.]*)<\/span>/g;
    let match;
    while ((match = cardPattern.exec(html)) !== null) {
      const permalink = match[1].split('?')[0];
      const priceStr = match[2].replace(/\./g, '');
      items.push({ id: permalink.split('-')[1] || permalink.slice(-12), permalink: permalink, price: parseInt(priceStr), title: '' });
      source = 'html_cards';
    }
  } catch(e) {}
}

if (!antiBot && items.length === 0) {
  try {
    const parsed = JSON.parse(html);
    if (parsed.results && Array.isArray(parsed.results)) { items = parsed.results; source = 'json'; }
    else if (Array.isArray(parsed)) { items = parsed; source = 'json'; }
  } catch(e) {}
}

// ===== Normalizacao comum + regras de negocio =====
const output = [];
const seen = new Set();

for (const r of items) {
  const id = String(r.id || r.item_id || r.permalink || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
  if (!id || seen.has(id)) continue;

  const price = parseFloat(r.price || r.current_price || 0);
  if (!price || price <= 0) continue;
  seen.add(id);

  const origPrice = parseFloat(r.original_price || r.was_price || r.list_price || price);
  const priceCents = Math.round(price * 100);
  const origCents = Math.round(origPrice * 100);
  const disc = origPrice > price ? parseFloat(((origPrice - price) / origPrice * 100).toFixed(2)) : 0;

  let sellerSales, sellerRep, ratingKnown;
  if (r._rating != null || r._sales != null) {
    sellerSales = r._sales || 0;
    ratingKnown = r._rating != null;
    sellerRep = ratingKnown ? r._rating : (sellerSales > 1000 ? 4.0 : sellerSales > 100 ? 3.5 : 3.0);
  } else {
    const srep = (r.seller && r.seller.seller_reputation) || {};
    sellerSales = (srep.transactions && srep.transactions.total) || 0;
    const pss = (r.seller && r.seller.power_seller_status) || srep.power_seller_status || '';
    ratingKnown = !!pss;
    sellerRep = pss === 'platinum' ? 5.0 : pss === 'gold' ? 4.5 : pss === 'silver' ? 4.0 : sellerSales > 100 ? 3.5 : 3.0;
  }
  sellerRep = Math.round(Math.max(0, Math.min(5, sellerRep)) * 10) / 10;

  const catId = r.category_id || CATEGORY;
  const thumbnail = r.thumbnail || r.image || '';
  const permalink = r.permalink || r.link || r.url || '';
  const title = r.title || r.name || '';
  const utmLink = montarLinkAfiliado(permalink);
  const vendedor = String(r._vendedor || '').trim();

  const idi = detectarIdioma(title);
  const auth = authenticity(title, price, ratingKnown, sellerRep, sellerSales, idi.idioma);
  const authSummary = 'autenticidade ' + (auth.score > 0 ? '+' : '') + auth.score + ' (' + auth.level + ') - ' + auth.detail;

  const vendKey = normNome(vendedor);
  const vendBloqueado = !!(vendKey && BLOQUEADOS.indexOf(vendKey) >= 0);

  let decision, reason, status = null, blockedReason = null;
  if (vendBloqueado) {
    decision = 'bloqueado';
    status = 'blocked';
    blockedReason = 'vendedor em lista de bloqueio: ' + vendedor;
    reason = 'vendedor bloqueado (' + vendedor + ') | desconto ' + disc + '% | ' + authSummary;
  } else if (disc > ML_MAX) {
    decision = 'bloqueado';
    reason = 'desconto ' + disc + '% > ' + ML_MAX + '% | ' + authSummary;
    status = 'blocked';
    blockedReason = 'suspeita de golpe: desconto ' + disc + '% acima do limite de ' + ML_MAX + '%';
  } else if (auth.score <= AUTH_BLOCK) {
    decision = 'bloqueado';
    reason = 'desconto ' + disc + '% ok | ' + authSummary;
    status = 'blocked';
    blockedReason = 'suspeita de falsificacao (score ' + auth.score + '): ' + auth.detail;
  } else if (disc < ML_MIN) {
    decision = 'descartado';
    reason = 'desconto ' + disc + '% < ' + ML_MIN + '% | ' + authSummary;
  } else if (auth.score >= AUTH_ACCEPT) {
    decision = 'aceito';
    reason = 'desconto ' + disc + '% ok | ' + authSummary;
    status = 'pending';
  } else {
    decision = 'revisao';
    reason = 'desconto ' + disc + '% ok | ' + authSummary;
    status = 'review';
    blockedReason = 'autenticidade duvidosa (score ' + auth.score + '): ' + auth.detail;
  }

  output.push({ json: {
    item_id: id,
    title: esc(String(title).slice(0, 300)),
    price_cents: priceCents,
    original_price_cents: origCents,
    discount_pct: disc,
    seller_reputation: sellerRep,
    seller_sales: sellerSales,
    category_id: esc(catId),
    thumbnail: esc(thumbnail),
    permalink: esc(permalink),
    utm_link: esc(utmLink),
    status: status,
    blocked_reason: blockedReason == null ? null : esc(String(blockedReason).slice(0, 500)),
    search_term: SEARCH_TERM,
    decision: decision,
    reason: esc(String(reason).slice(0, 500)),
    auth_score: auth.score,
    auth_level: auth.level,
    auth_detail: esc(String(auth.detail).slice(0, 500)),
    auth_qty: auth.qty,
    auth_unit_price: auth.unit_price,
    idioma: idi.idioma,
    idioma_confianca: idi.confianca,
    vendedor: esc(vendedor.slice(0, 120)),
    vendedor_bloqueado: vendBloqueado,
    _source: source || 'desconhecida'
  }});
}

if (output.length > 0) return output;

// ===== Nada extraido: registra o motivo em promos_erros =====
let msg;
if (antiBot) msg = 'anti-bot do MercadoLivre: HTML contem suspicious-traffic';
else if (parseErr) msg = parseErr;
else if (!html || html.length === 0) msg = 'resposta vazia do MercadoLivre';
else if (items.length > 0) msg = items.length + ' cards encontrados mas nenhum normalizavel (sem id ou sem preco)';
else msg = 'parser extraiu 0 itens de um HTML de ' + html.length + ' bytes';

const payload = {
  motivo: msg,
  anti_bot: antiBot,
  html_length: html.length,
  cards_brutos: items.length,
  fonte: source || 'nenhuma',
  html_snippet: String(html).slice(0, 600)
};

return [{ json: {
  _parse_error: true,
  item_id: null,
  decision: 'erro_parser',
  reason: esc(String(msg).slice(0, 400)),
  error_msg: esc(String(msg).slice(0, 400)),
  payload_json: esc(JSON.stringify(payload))
}}];
