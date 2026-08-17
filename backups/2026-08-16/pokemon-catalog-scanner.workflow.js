import { workflow, node, trigger, sticky, newCredential, switchCase, expr } from '@n8n/workflow-sdk';

const manual = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Rodar na Mao', position: [240, 300] }
});

const diario = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'As 7h BRT',
    position: [240, 480],
    parameters: {
      rule: {
        interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 7, triggerAtMinute: 0 }]
      }
    }
  }
});

const jitter = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: {
    name: 'Jitter Inicial',
    position: [480, 380],
    parameters: {
      resume: 'timeInterval',
      amount: expr('{{ Math.floor(Math.random() * 16) }}'),
      unit: 'seconds'
    }
  }
});

const buscarPromos = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Buscar Promos Existentes',
    position: [720, 380],
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'executeQuery',
      query: "SELECT item_id, title, price_cents, permalink, status, COALESCE(search_term, '') AS search_term FROM promos WHERE created_at > NOW() - INTERVAL '120 days' ORDER BY id DESC LIMIT 5000;"
    },
    credentials: { postgres: newCredential('Pokemon Promos DB') }
  }
});

const buscarLojas = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Buscar Lojas Ativas',
    position: [960, 380],
    executeOnce: true,
    parameters: {
      operation: 'executeQuery',
      query: 'SELECT slug, nome, official_store_id, owner_id, storefront_id, prioridade, desconto_minimo, preco_minimo, preco_maximo, filtro_titulo FROM lojas_confiaveis WHERE ativa = TRUE ORDER BY prioridade ASC, id ASC;'
    },
    credentials: { postgres: newCredential('Pokemon Promos DB') }
  }
});

const filtrarLoja = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Filtrar Loja de Teste',
    position: [1200, 380],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "// true = so a loja pokemon (10 creditos). false = todas as lojas ativas.\nconst TESTE_SO_POKEMON = true;\nconst items = $input.all();\nif (!TESTE_SO_POKEMON) return items;\nreturn items.filter(function (it) {\n  return it && it.json && String(it.json.slug) === 'pokemon';\n});\n"
    }
  }
});

const baixar = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Baixar Catalogo da Loja',
    position: [1440, 380],
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: 'http://api.scraperapi.com/',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpQueryAuth',
      sendQuery: true,
      specifyQuery: 'keypair',
      queryParameters: {
        parameters: [
          { name: 'url', value: '=https://lista.mercadolivre.com.br/loja/{{ $json.slug }}/pokemon' },
          { name: 'render', value: 'true' },
          { name: 'country_code', value: 'br' }
        ]
      },
      options: {
        timeout: 120000,
        batching: { batch: { batchSize: 1, batchInterval: 20000 } },
        response: { response: { fullResponse: true, neverError: true, responseFormat: 'text' } }
      }
    },
    credentials: { httpQueryAuth: newCredential('ScraperAPI Query Auth') }
  }
});

const extrair = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Extrair Ofertas do Catalogo',
    position: [1680, 380],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "// ===== Catalog Scanner: listagem lista.mercadolivre.com.br/loja/{slug}/pokemon =====\n// Parser: _n.ctx.r= (JSON puro) -> appProps.pageProps.initialState.results[].polycard\n// A homepage usa _n.ctx.s.q( — extrairPayloadLoja NAO serve aqui.\n// Helpers de preco, afiliado, filtro e idioma iguais ao Store Scanner.\n\nconst AFILIADO_APELIDO = 'caed1312314';\nconst AFILIADO_TOOL_ID = '96097202';\n\nfunction montarLinkAfiliado(urlProduto) {\n  const limpa = String(urlProduto == null ? '' : urlProduto).split('#')[0].split('?')[0];\n  if (!limpa) return '';\n  return limpa + '?matt_word=' + AFILIADO_APELIDO + '&matt_tool=' + AFILIADO_TOOL_ID + '&forceInApp=true';\n}\n\nconst BS = String.fromCharCode(92);\nconst RE_ACENTO = new RegExp('[' + String.fromCharCode(768) + '-' + String.fromCharCode(879) + ']', 'g');\nconst RE_LIXO = new RegExp('[^a-z0-9/ -]', 'g');\nconst RE_ESPACOS = new RegExp(' +', 'g');\nconst RE_CATALOGO = /\\/p\\/(ML[A-Z]?[0-9]+)/;\n\nconst PALAVRAS_RUIDO = ['pokemon','tcg','original','originais','oficial','lacrada','lacrado','lacradas','lacrados','nacional','portugues','copag','colecao','jogo','jogos','cartas','carta','em','de','da','do','dos','das','com','e','o','a','os','as','um','uma','para','novo','nova','produto','-'];\n\nfunction bord(fonte) { return new RegExp(fonte.split('~').join(BS + 'b'), 'i'); }\nfunction esc(s) { return String(s == null ? '' : s).split(String.fromCharCode(39)).join(String.fromCharCode(39) + String.fromCharCode(39)); }\nfunction aspas(s) { return String.fromCharCode(39) + esc(s) + String.fromCharCode(39); }\nfunction semAcento(s) { return String(s == null ? '' : s).normalize('NFD').replace(RE_ACENTO, ''); }\nfunction norm(t) { return semAcento(t).toLowerCase().replace(RE_LIXO, ' ').replace(RE_ESPACOS, ' ').trim(); }\nfunction num(v, padrao) { const n = parseFloat(v); return isNaN(n) ? padrao : n; }\n\nfunction assinaturaTitulo(titulo) {\n  const partes = norm(titulo).split(' ');\n  const unicos = [];\n  for (const p of partes) {\n    if (!p) continue;\n    if (PALAVRAS_RUIDO.indexOf(p) >= 0) continue;\n    if (unicos.indexOf(p) < 0) unicos.push(p);\n  }\n  unicos.sort();\n  return unicos.join(' ');\n}\n\nfunction catalogoDeLink(link) {\n  const m = String(link == null ? '' : link).match(RE_CATALOGO);\n  return m ? m[1] : '';\n}\n\nfunction addLista(mapa, chave, valor) {\n  if (!chave) return;\n  if (!mapa[chave]) mapa[chave] = [];\n  mapa[chave].push(valor);\n}\n\nfunction acharOutro(mapa, chave, itemId, ignorar) {\n  if (!chave) return null;\n  const lista = mapa[chave] || [];\n  for (const r of lista) {\n    if (r.item_id === itemId) continue;\n    if (ignorar && ignorar[r.item_id]) continue;\n    return r;\n  }\n  return null;\n}\n\nconst REGRAS_IDIOMA = [\n  ['ja', bord('(japones|japonesa|japonesas|japoneses|japanese|~japan~)')],\n  ['en', bord('(ingles|inglesa|~english~|~eng~|~ing~)')],\n  ['pt', bord('(portugues|portuguesa|~nacional~|~ptbr~|~pt-br~|~pt br~|~copag~)')],\n  ['ko', bord('(coreano|coreana|korean)')],\n  ['zh', bord('(chines|chinesa|chinese)')]\n];\nconst SINAIS_PT_PRODUTO = bord('(treinador avancado|deck de batalha|baralho de batalha|mega evolucao)');\nconst SINAIS_EN_PRODUTO = bord('(elite trainer box|~etb~|battle deck|mega evolution|pitch black)');\n\nfunction detectarIdioma(titulo, searchTerm) {\n  const n = norm(titulo);\n  const achados = [];\n  for (const regra of REGRAS_IDIOMA) {\n    if (regra[1].test(n) && achados.indexOf(regra[0]) < 0) achados.push(regra[0]);\n  }\n  if (achados.length > 1) return { idioma: 'ambiguo', confianca: 0.4, candidatos: achados.slice().sort() };\n  if (achados.length === 1) {\n    const ultima = n.split(' ').pop() || '';\n    let re = null;\n    for (const regra of REGRAS_IDIOMA) if (regra[0] === achados[0]) re = regra[1];\n    return { idioma: achados[0], confianca: re.test(ultima) ? 0.97 : 0.85 };\n  }\n  const temPt = SINAIS_PT_PRODUTO.test(n);\n  const temEn = SINAIS_EN_PRODUTO.test(n);\n  if (temPt && temEn) return { idioma: 'ambiguo', confianca: 0.4, candidatos: ['en', 'pt'] };\n  if (temEn) return { idioma: 'en', confianca: 0.85 };\n  if (temPt) return { idioma: 'pt', confianca: 0.85 };\n  const loja = String(searchTerm || '').toLowerCase();\n  if (loja.indexOf('loja:copag') === 0 || loja.indexOf('loja:pokemon') === 0) return { idioma: 'pt', confianca: 0.85 };\n  return { idioma: 'desconhecido', confianca: 0 };\n}\n\nfunction extrairPayloadLista(html) {\n  const marca = '_n.ctx.r=';\n  const i = html.indexOf(marca);\n  if (i < 0) return null;\n  const s = html.indexOf('{', i);\n  if (s < 0) return null;\n  let depth = 0;\n  let inStr = false;\n  let escaped = false;\n  for (let j = s; j < html.length; j++) {\n    const ch = html[j];\n    if (inStr) {\n      if (escaped) escaped = false;\n      else if (ch === BS) escaped = true;\n      else if (ch === '\"') inStr = false;\n    } else {\n      if (ch === '\"') inStr = true;\n      else if (ch === '{') depth++;\n      else if (ch === '}') {\n        depth--;\n        if (depth === 0) {\n          try { return JSON.parse(html.slice(s, j + 1)); } catch (e) { return null; }\n        }\n      }\n    }\n  }\n  return null;\n}\n\nfunction estadoLista(raiz) {\n  const app = raiz && raiz.appProps ? raiz.appProps : {};\n  const page = app.pageProps ? app.pageProps : {};\n  return page.initialState ? page.initialState : {};\n}\n\nfunction coletarPolycardsLista(raiz) {\n  const estado = estadoLista(raiz);\n  const results = Array.isArray(estado.results) ? estado.results : [];\n  const unicos = [];\n  const vistos = {};\n  for (const r of results) {\n    const p = r && r.polycard ? r.polycard : null;\n    if (!p || !p.metadata || !p.metadata.id) continue;\n    const id = String(p.metadata.id);\n    if (vistos[id]) continue;\n    vistos[id] = 1;\n    unicos.push(p);\n  }\n  return unicos;\n}\n\nfunction paginacaoLista(raiz) {\n  const pag = estadoLista(raiz).pagination || {};\n  const pageCount = pag.page_count != null ? Number(pag.page_count) : null;\n  const resultsLimit = pag.results_limit != null ? Number(pag.results_limit) : null;\n  return {\n    page_count: (pageCount != null && !isNaN(pageCount)) ? pageCount : null,\n    results_limit: (resultsLimit != null && !isNaN(resultsLimit)) ? resultsLimit : null\n  };\n}\n\nfunction acharCtxPolycard(raiz) {\n  let achado = null;\n  function anda(n, d) {\n    if (achado || !n || typeof n !== 'object' || d > 14) return;\n    if (Array.isArray(n)) { for (const x of n) anda(x, d + 1); return; }\n    if (n.polycard_context && n.polycard_context.picture_template) { achado = n.polycard_context; return; }\n    for (const k of Object.keys(n)) anda(n[k], d + 1);\n  }\n  anda(raiz, 0);\n  return achado;\n}\n\nfunction acharStorefront(raiz) {\n  let achado = null;\n  function anda(n, d) {\n    if (achado || !n || typeof n !== 'object' || d > 14) return;\n    if (Array.isArray(n)) { for (const x of n) anda(x, d + 1); return; }\n    if (n.storefront && typeof n.storefront === 'object' && (n.storefront.subdomain || n.storefront.name)) { achado = n.storefront; return; }\n    for (const k of Object.keys(n)) anda(n[k], d + 1);\n  }\n  anda(raiz, 0);\n  return achado || {};\n}\n\nfunction comp(p, t) {\n  const lista = p.components || [];\n  for (const c of lista) if (c && c.type === t) return c;\n  return null;\n}\n\nfunction montarThumb(template, picId) {\n  if (!template || !picId) return '';\n  return String(template).split('{square}').join('Q').split('{2x}').join('').split('{id}').join(picId).split('{size}').join('AB').split('{sanitized_title}').join('');\n}\n\nfunction idxPar(item, padrao) {\n  const p = item.pairedItem;\n  if (typeof p === 'number') return p;\n  if (p && typeof p.item === 'number') return p.item;\n  if (Array.isArray(p) && p.length && p[0] && typeof p[0].item === 'number') return p[0].item;\n  return padrao;\n}\n\nfunction precoOriginalDoCard(precoObj) {\n  if (precoObj.previous_price && precoObj.previous_price.value != null) {\n    const v = Number(precoObj.previous_price.value);\n    if (!isNaN(v) && v > 0) return v;\n  }\n  const rotulos = precoObj.price_labels || [];\n  let achado = null;\n  for (const lb of rotulos) {\n    const valores = (lb && lb.values) || [];\n    for (const v of valores) {\n      if (!v || v.type !== 'price' || !v.price || !v.price.previous) continue;\n      const bruto = v.price.previous;\n      let cand = null;\n      if (typeof bruto === 'number') cand = bruto;\n      else if (bruto && bruto.value != null) cand = Number(bruto.value);\n      else if (v.price.value != null) cand = Number(v.price.value);\n      if (cand != null && !isNaN(cand) && cand > 0) achado = cand;\n    }\n  }\n  return achado;\n}\n\nlet existentes = [];\ntry { existentes = $('Buscar Promos Existentes').all(); } catch (e) { existentes = []; }\n\nconst bancoCatalogo = {};\nconst bancoAssinatura = {};\nlet linhasBanco = 0;\nfor (const r of existentes) {\n  const j = (r && r.json) ? r.json : {};\n  const iid = j.item_id ? String(j.item_id) : '';\n  if (!iid) continue;\n  linhasBanco++;\n  const reg = { item_id: iid, status: j.status ? String(j.status) : '', origem: j.search_term ? String(j.search_term) : '' };\n  addLista(bancoCatalogo, catalogoDeLink(j.permalink), reg);\n  addLista(bancoAssinatura, assinaturaTitulo(j.title) + '|' + String(j.price_cents), reg);\n}\n\nconst respostas = $input.all();\nlet linhasLojas = [];\ntry { linhasLojas = $('Filtrar Loja de Teste').all(); } catch (e) {\n  try { linhasLojas = $('Buscar Lojas Ativas').all(); } catch (e2) { linhasLojas = []; }\n}\nconst saida = [];\nconst candidatos = [];\nconst resumosDasLojas = [];\n\nfor (let i = 0; i < respostas.length; i++) {\n  const resp = respostas[i];\n  const linha = linhasLojas[idxPar(resp, i)] || linhasLojas[i] || null;\n  const loja = linha ? linha.json : {};\n  const slug = String(loja.slug || '');\n  const nomeLoja = String(loja.nome || slug || 'desconhecida');\n  const httpStatus = resp.json.statusCode == null ? null : Number(resp.json.statusCode);\n  let html = '';\n  if (typeof resp.json.body === 'string') html = resp.json.body;\n  else if (typeof resp.json.data === 'string') html = resp.json.data;\n  else if (resp.json.body != null) html = JSON.stringify(resp.json.body);\n\n  const descMin = num(loja.desconto_minimo, 15);\n  const precoMin = num(loja.preco_minimo, 0);\n  const precoMax = (loja.preco_maximo == null || loja.preco_maximo === '') ? null : num(loja.preco_maximo, null);\n  const filtroTxt = loja.filtro_titulo ? String(loja.filtro_titulo).trim() : '';\n  const searchTerm = 'loja:' + slug + ':catalogo';\n\n  let reFiltro = null;\n  let erroLoja = null;\n  if (filtroTxt) {\n    try { reFiltro = new RegExp(filtroTxt, 'i'); }\n    catch (e) { erroLoja = 'filtro_titulo invalido na loja ' + slug + ' (' + filtroTxt + '): ' + (e && e.message ? e.message : String(e)) + '. Varredura abortada para nao deixar passar produto fora do tema.'; }\n  }\n\n  let raiz = null;\n  let pag = { page_count: null, results_limit: null };\n  if (!erroLoja) {\n    if (html.indexOf('suspicious-traffic') >= 0) {\n      erroLoja = 'pagina de bloqueio suspicious-traffic na listagem da loja ' + slug + ' (HTTP ' + httpStatus + '): ScraperAPI nao conseguiu renderizar o catalogo';\n    } else if (httpStatus != null && httpStatus !== 200) {\n      erroLoja = 'HTTP ' + httpStatus + ' ao baixar o catalogo da loja ' + slug + ' via ScraperAPI (bloqueio, timeout ou slug invalido)';\n    } else if (!html) {\n      erroLoja = 'resposta vazia do ScraperAPI para o catalogo da loja ' + slug + ' (HTTP ' + httpStatus + ')';\n    } else {\n      raiz = extrairPayloadLista(html);\n      if (!raiz) {\n        erroLoja = html.indexOf('_n.ctx.r=') < 0\n          ? 'payload _n.ctx.r ausente na listagem da loja ' + slug + ' (HTTP ' + httpStatus + '): layout do Mercado Livre mudou ou a pagina nao renderizou'\n          : 'payload _n.ctx.r encontrado mas o JSON da listagem da loja ' + slug + ' nao pode ser decodificado (HTTP ' + httpStatus + ')';\n      } else {\n        pag = paginacaoLista(raiz);\n      }\n    }\n  }\n\n  function empurrarFalha(motivo, produtosTotal, idsLoja) {\n    const ids = idsLoja || { official: 'NULL', owner: 'NULL', storefront: 'NULL' };\n    const payloadErro = { motivo: motivo, loja: slug, origem: 'catalogo', http_status: httpStatus, produtos_encontrados: produtosTotal, page_count: pag.page_count, results_limit: pag.results_limit, html_length: html.length, html_snippet: String(html).slice(0, 600) };\n    saida.push({ json: { decisao: 'erro_parser', slug: slug, error_msg: esc(String(motivo).slice(0, 400)), payload_json: esc(JSON.stringify(payloadErro)) } });\n    saida.push({ json: { decisao: 'resumo', slug: slug, nome: nomeLoja, produtos_total: produtosTotal, passou_filtro: 0, com_oferta: 0, aceitos: 0, descartados: 0, duplicados: 0, barrados: 0, page_count: pag.page_count, results_limit: pag.results_limit, amostra_barrados: [], official_store_id_sql: ids.official, owner_id_sql: ids.owner, storefront_id_sql: ids.storefront, ultimo_erro_sql: aspas(String(motivo).slice(0, 400)), reason: esc(('catalogo ' + slug + ': varredura falhou - ' + motivo).slice(0, 500)) } });\n  }\n\n  if (erroLoja) {\n    empurrarFalha(erroLoja, 0, null);\n    continue;\n  }\n\n  const cards = coletarPolycardsLista(raiz);\n  const ctx = acharCtxPolycard(raiz);\n  const template = (ctx && ctx.picture_template) ? String(ctx.picture_template) : '';\n  const sf = acharStorefront(raiz);\n  const attrs = (sf.attributes && sf.attributes.brand_attributes) ? sf.attributes.brand_attributes : {};\n  const officialStoreId = attrs.official_store_id != null ? Number(attrs.official_store_id) : null;\n  const ownerId = sf.owner_id != null ? Number(sf.owner_id) : null;\n  const subdominio = sf.subdomain ? String(sf.subdomain) : '';\n  const idsLoja = {\n    official: officialStoreId == null ? 'NULL' : String(officialStoreId),\n    owner: ownerId == null ? 'NULL' : String(ownerId),\n    storefront: subdominio ? aspas(subdominio) : 'NULL'\n  };\n\n  if (cards.length === 0) {\n    empurrarFalha('catalogo da loja ' + slug + ' voltou com zero produtos na pagina 1 (HTTP ' + httpStatus + ', page_count=' + pag.page_count + ', results_limit=' + pag.results_limit + '): busca sem resultado, loja sem pokemon ou o layout mudou.', 0, idsLoja);\n    continue;\n  }\n\n  let passouFiltro = 0;\n  let comOferta = 0;\n  let descartados = 0;\n  let barrados = 0;\n  const amostraBarrados = [];\n\n  for (const p of cards) {\n    const md = p.metadata || {};\n    const id = md.id ? String(md.id) : '';\n    if (!id) continue;\n    const cTitulo = comp(p, 'title');\n    const titulo = (cTitulo && cTitulo.title && cTitulo.title.text) ? String(cTitulo.title.text) : '';\n    const cPreco = comp(p, 'price');\n    const precoObj = (cPreco && cPreco.price) ? cPreco.price : {};\n    const preco = (precoObj.current_price && precoObj.current_price.value != null) ? Number(precoObj.current_price.value) : null;\n    const precoOrig = precoOriginalDoCard(precoObj);\n    const rotuloDesc = (precoObj.discount_label && precoObj.discount_label.text) ? String(precoObj.discount_label.text) : '';\n    const freteGratis = !!(comp(p, 'shipping') || comp(p, 'shipping_v2'));\n    const pics = (p.pictures && p.pictures.pictures) ? p.pictures.pictures : [];\n    const picId = (pics.length && pics[0]) ? pics[0].id : null;\n    const thumb = montarThumb(template, picId);\n    const urlBruta = md.url ? String(md.url) : '';\n    const linkCompleto = urlBruta ? ((urlBruta.indexOf('http') === 0 ? urlBruta : ('https://' + urlBruta)) + (md.url_params ? String(md.url_params) : '')) : '';\n    const linkLimpo = linkCompleto ? linkCompleto.split('#')[0].split('?')[0] : '';\n    const utm = montarLinkAfiliado(linkLimpo);\n    const idi = detectarIdioma(titulo, searchTerm);\n    const catalogo = md.product_id ? String(md.product_id) : catalogoDeLink(linkLimpo);\n\n    if (reFiltro && !(reFiltro.test(titulo) || reFiltro.test(norm(titulo)))) {\n      barrados++;\n      if (amostraBarrados.length < 8) amostraBarrados.push(titulo.slice(0, 60));\n      saida.push({ json: { decisao: 'fora_do_filtro', slug: slug, item_id: id, title: titulo, motivo: 'titulo fora do filtro da loja (' + filtroTxt + ')' } });\n      continue;\n    }\n    passouFiltro++;\n\n    if (!preco || !(preco > 0)) {\n      saida.push({ json: { decisao: 'sem_oferta', slug: slug, item_id: id, title: titulo, motivo: 'card sem preco atual legivel' } });\n      continue;\n    }\n    if (precoOrig == null || !(precoOrig > preco)) {\n      saida.push({ json: { decisao: 'sem_oferta', slug: slug, item_id: id, title: titulo, preco: preco, motivo: 'sem preco original: produto nao esta em oferta' } });\n      continue;\n    }\n    comOferta++;\n\n    const desconto = Math.round(((precoOrig - preco) / precoOrig) * 10000) / 100;\n    const precoCents = Math.round(preco * 100);\n    const origCents = Math.round(precoOrig * 100);\n    const resumoPreco = 'de R$ ' + precoOrig.toFixed(2) + ' por R$ ' + preco.toFixed(2);\n    const base = 'catalogo ' + slug + ' | ' + resumoPreco + ' | desconto ' + desconto.toFixed(2) + '% (minimo ' + descMin + '%)' + (rotuloDesc ? ' | rotulo ' + rotuloDesc : '') + ' | idioma ' + idi.idioma + ' (' + idi.confianca + ')' + (catalogo ? ' | catalogo ' + catalogo : '') + (freteGratis ? ' | frete gratis' : '');\n\n    let motivoDescarte = null;\n    if (desconto < descMin) motivoDescarte = 'desconto abaixo do minimo da loja';\n    else if (desconto >= 95) motivoDescarte = 'desconto de ' + desconto + '% implausivel, provavel erro de leitura de preco';\n    else if (preco < precoMin) motivoDescarte = 'preco abaixo do minimo configurado para a loja';\n    else if (precoMax != null && preco > precoMax) motivoDescarte = 'preco acima do maximo configurado para a loja';\n\n    if (motivoDescarte) {\n      descartados++;\n      saida.push({ json: { decisao: 'descartado', slug: slug, item_id: id, title: esc(titulo.slice(0, 300)), title_bruto: titulo, reason: esc((base + ' | descartado: ' + motivoDescarte).slice(0, 500)) } });\n      continue;\n    }\n\n    candidatos.push({\n      item_id: id,\n      slug: slug,\n      catalogo: catalogo,\n      assinatura: assinaturaTitulo(titulo),\n      price_cents: precoCents,\n      title_esc: esc(titulo.slice(0, 300)),\n      title_bruto: titulo,\n      base: base,\n      json: {\n        decisao: 'aceito',\n        slug: slug,\n        loja_nome: nomeLoja,\n        loja_slug: slug,\n        item_id: id,\n        title: esc(titulo.slice(0, 300)),\n        title_bruto: titulo,\n        price_cents: precoCents,\n        original_price_cents: origCents,\n        discount_pct: desconto,\n        preco_de: precoOrig,\n        preco_por: preco,\n        seller_reputation_sql: 'NULL',\n        seller_sales_sql: 'NULL',\n        category_id_sql: 'NULL',\n        thumbnail: esc(thumb),\n        permalink: esc(linkLimpo),\n        utm_link: esc(utm),\n        utm_link_bruto: utm,\n        search_term: searchTerm,\n        idioma: idi.idioma,\n        idioma_confianca: idi.confianca,\n        idioma_sql: aspas(idi.idioma),\n        idioma_confianca_sql: String(idi.confianca),\n        produto_catalogo: catalogo,\n        frete_gratis: freteGratis,\n        assinatura_produto: assinaturaTitulo(titulo),\n        reason: esc(('aceito | ' + base).slice(0, 500)),\n        payload_erro: esc(JSON.stringify({ item_id: id, title: titulo, price_cents: precoCents, discount_pct: desconto, permalink: linkLimpo, loja: slug, origem: 'catalogo' }))\n      }\n    });\n  }\n\n  resumosDasLojas.push({\n    slug: slug,\n    nome: nomeLoja,\n    produtos_total: cards.length,\n    passou_filtro: passouFiltro,\n    com_oferta: comOferta,\n    descartados: descartados,\n    barrados: barrados,\n    amostra_barrados: amostraBarrados,\n    page_count: pag.page_count,\n    results_limit: pag.results_limit,\n    ids: idsLoja\n  });\n}\n\nconst idsDaVarredura = {};\nfor (const c of candidatos) idsDaVarredura[c.item_id] = 1;\n\nconst comCatalogo = [];\nconst semCatalogo = [];\nfor (const c of candidatos) { if (c.catalogo) comCatalogo.push(c); else semCatalogo.push(c); }\nconst ordenados = comCatalogo.concat(semCatalogo);\n\nconst vistoCatalogo = {};\nconst vistoAssinatura = {};\nconst aceitosPorLoja = {};\nconst duplicadosPorLoja = {};\n\nfor (const c of ordenados) {\n  const chaveAss = c.assinatura + '|' + String(c.price_cents);\n  let mantido = null;\n  let criterio = '';\n\n  if (c.catalogo && vistoCatalogo[c.catalogo]) {\n    mantido = vistoCatalogo[c.catalogo].item_id;\n    criterio = 'mesmo product_id de catalogo (' + c.catalogo + ') ja aceito nesta varredura, na loja ' + vistoCatalogo[c.catalogo].slug;\n  } else {\n    const noBancoCat = acharOutro(bancoCatalogo, c.catalogo, c.item_id, idsDaVarredura);\n    if (noBancoCat) {\n      mantido = noBancoCat.item_id;\n      criterio = 'mesmo product_id de catalogo (' + c.catalogo + ') de item ja gravado em promos' + (noBancoCat.origem ? ' (' + noBancoCat.origem + ')' : '');\n    } else if (vistoAssinatura[chaveAss]) {\n      mantido = vistoAssinatura[chaveAss].item_id;\n      criterio = 'titulo normalizado + preco iguais aos de item ja aceito nesta varredura, na loja ' + vistoAssinatura[chaveAss].slug + ' (assinatura: ' + c.assinatura + ')';\n    } else {\n      const noBancoAss = acharOutro(bancoAssinatura, chaveAss, c.item_id, idsDaVarredura);\n      if (noBancoAss) {\n        mantido = noBancoAss.item_id;\n        criterio = 'titulo normalizado + preco iguais aos de item ja gravado em promos' + (noBancoAss.origem ? ' (' + noBancoAss.origem + ')' : '') + ' (assinatura: ' + c.assinatura + ')';\n      }\n    }\n  }\n\n  if (mantido) {\n    duplicadosPorLoja[c.slug] = (duplicadosPorLoja[c.slug] || 0) + 1;\n    saida.push({ json: {\n      decisao: 'descartado',\n      slug: c.slug,\n      item_id: c.item_id,\n      title: c.title_esc,\n      title_bruto: c.title_bruto,\n      duplicata_de: mantido,\n      criterio_duplicata: criterio,\n      reason: esc(('duplicata de produto: mantido ' + mantido + ' | criterio: ' + criterio + ' | ' + c.base).slice(0, 500))\n    } });\n    continue;\n  }\n\n  if (c.catalogo) vistoCatalogo[c.catalogo] = { item_id: c.item_id, slug: c.slug };\n  vistoAssinatura[chaveAss] = { item_id: c.item_id, slug: c.slug };\n  aceitosPorLoja[c.slug] = (aceitosPorLoja[c.slug] || 0) + 1;\n  saida.push({ json: c.json });\n}\n\nfor (const r of resumosDasLojas) {\n  const aceitos = aceitosPorLoja[r.slug] || 0;\n  const duplicados = duplicadosPorLoja[r.slug] || 0;\n  const pagTxt = 'page_count=' + r.page_count + ' results_limit=' + r.results_limit + ' (so pagina 1 nesta versao)';\n  const resumoTexto = 'catalogo ' + r.slug + ': ' + r.produtos_total + ' produtos na pagina 1, ' + r.passou_filtro + ' passaram no filtro de titulo, ' + r.com_oferta + ' com preco de/por, ' + aceitos + ' aceitos, ' + r.descartados + ' descartados por regra de preco, ' + duplicados + ' duplicatas de produto, ' + r.barrados + ' barrados pelo filtro, ' + pagTxt + ' (dedup comparou com ' + linhasBanco + ' linhas de promos)' + (r.amostra_barrados.length ? ' | exemplos barrados: ' + r.amostra_barrados.join(' ; ') : '');\n\n  saida.push({ json: {\n    decisao: 'resumo',\n    slug: r.slug,\n    nome: r.nome,\n    produtos_total: r.produtos_total,\n    passou_filtro: r.passou_filtro,\n    com_oferta: r.com_oferta,\n    aceitos: aceitos,\n    descartados: r.descartados,\n    duplicados: duplicados,\n    barrados: r.barrados,\n    page_count: r.page_count,\n    results_limit: r.results_limit,\n    amostra_barrados: r.amostra_barrados,\n    promos_comparadas: linhasBanco,\n    official_store_id_sql: r.ids.official,\n    owner_id_sql: r.ids.owner,\n    storefront_id_sql: r.ids.storefront,\n    ultimo_erro_sql: 'NULL',\n    reason: esc(resumoTexto.slice(0, 500))\n  } });\n}\n\nif (saida.length === 0) {\n  const motivo = 'nenhuma loja ativa devolveu resposta no catalogo: verifique Filtrar Loja de Teste e lojas_confiaveis';\n  saida.push({ json: { decisao: 'erro_parser', slug: '', error_msg: esc(motivo), payload_json: esc(JSON.stringify({ motivo: motivo, respostas: respostas.length })) } });\n}\n\nreturn saida;\n"
    }
  }
});

const injetar = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Injetar Wid e Loja',
    position: [1920, 380],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "const items = $input.all();\nconst out = [];\nfor (const it of items) {\n  const d = Object.assign({}, it.json);\n  if (d.decisao === 'aceito') {\n    const id = String(d.item_id || '');\n    let u = String(d.utm_link || '');\n    if (id && u && u.indexOf('wid=') < 0) {\n      u = u + (u.indexOf('?') >= 0 ? '&' : '?') + 'wid=' + encodeURIComponent(id);\n      d.utm_link = u;\n      d.utm_link_bruto = u;\n    }\n    if (!d.loja_slug && d.slug) d.loja_slug = String(d.slug);\n  }\n  out.push({ json: d });\n}\nreturn out;\n"
    }
  }
});

const rotear = switchCase({
  version: 3.2,
  config: {
    name: 'Rotear Decisao do Catalogo',
    position: [2160, 380],
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          {
          outputKey: "aceito",
          renameOutput: true,
          conditions: {
            options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
            conditions: [{
              leftValue: expr('{{ $json.decisao }}'),
              operator: { type: 'string', operation: 'equals' },
              rightValue: "aceito"
            }],
            combinator: 'and'
          }
        },
          {
          outputKey: "descartado",
          renameOutput: true,
          conditions: {
            options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
            conditions: [{
              leftValue: expr('{{ $json.decisao }}'),
              operator: { type: 'string', operation: 'equals' },
              rightValue: "descartado"
            }],
            combinator: 'and'
          }
        },
          {
          outputKey: "resumo",
          renameOutput: true,
          conditions: {
            options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
            conditions: [{
              leftValue: expr('{{ $json.decisao }}'),
              operator: { type: 'string', operation: 'equals' },
              rightValue: "resumo"
            }],
            combinator: 'and'
          }
        },
          {
          outputKey: "erro_parser",
          renameOutput: true,
          conditions: {
            options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
            conditions: [{
              leftValue: expr('{{ $json.decisao }}'),
              operator: { type: 'string', operation: 'equals' },
              rightValue: "erro_parser"
            }],
            combinator: 'and'
          }
        }
        ]
      },
      options: { fallbackOutput: 'none' }
    }
  }
});

const inserir = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Inserir Promo do Catalogo',
    position: [2480, 160],
    onError: 'continueErrorOutput',
    parameters: {
      operation: 'executeQuery',
      query: "=WITH antigo AS (\n  SELECT item_id, price_cents\n  FROM promos\n  WHERE item_id = '{{ $json.item_id }}'\n), gravado AS (\n  INSERT INTO promos (item_id, title, price_cents, original_price_cents, discount_pct, seller_reputation, seller_sales, category_id, thumbnail, permalink, utm_link, status, search_term, loja_slug, idioma, idioma_confianca) VALUES ('{{ $json.item_id }}', '{{ $json.title }}', {{ $json.price_cents }}, {{ $json.original_price_cents }}, {{ $json.discount_pct }}, {{ $json.seller_reputation_sql }}, {{ $json.seller_sales_sql }}, {{ $json.category_id_sql }}, '{{ $json.thumbnail }}', '{{ $json.permalink }}', '{{ $json.utm_link }}', 'pending', '{{ $json.search_term }}', NULLIF('{{ $json.loja_slug }}',''), {{ $json.idioma_sql }}, {{ $json.idioma_confianca_sql }})\n  ON CONFLICT (item_id) DO UPDATE SET title = EXCLUDED.title, price_cents = EXCLUDED.price_cents, original_price_cents = EXCLUDED.original_price_cents, discount_pct = EXCLUDED.discount_pct, thumbnail = EXCLUDED.thumbnail, permalink = EXCLUDED.permalink, utm_link = EXCLUDED.utm_link, idioma = EXCLUDED.idioma, idioma_confianca = EXCLUDED.idioma_confianca, category_id = EXCLUDED.category_id, loja_slug = EXCLUDED.loja_slug, status = 'pending', posted_at = NULL, telegram_message_id = NULL, blocked_reason = NULL\n  WHERE promos.status = 'posted' AND EXCLUDED.price_cents < promos.price_cents AND ((promos.price_cents - EXCLUDED.price_cents) * 100 >= promos.price_cents * 5 OR (promos.price_cents - EXCLUDED.price_cents) >= 500) AND COALESCE(EXCLUDED.utm_link, '') LIKE '%matt_word=caed1312314%' AND COALESCE(EXCLUDED.utm_link, '') LIKE '%matt_tool=96097202%' AND COALESCE(EXCLUDED.thumbnail, '') LIKE 'http%' AND NOT EXISTS (SELECT 1 FROM promos_log pl WHERE pl.item_id = promos.item_id AND pl.decision = 'repost' AND pl.created_at > NOW() - INTERVAL '1 day')\n  RETURNING item_id, price_cents, (xmax = 0) AS inserido\n)\nSELECT g.item_id,\n  CASE WHEN g.inserido THEN 'aceito' ELSE 'repost' END AS decision,\n  CASE WHEN g.inserido THEN NULL ELSE 'repost | R$ ' || replace(to_char(a.price_cents / 100.0, 'FM999990.00'), '.', ',') || ' -> R$ ' || replace(to_char(g.price_cents / 100.0, 'FM999990.00'), '.', ',') || ' | queda no catalogo (polycard)' END AS reason_repost\nFROM gravado g\nLEFT JOIN antigo a ON TRUE;"
    },
    credentials: { postgres: newCredential('Pokemon Promos DB') }
  }
});

const logAceito = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Log Aceito Catalogo',
    position: [2720, 80],
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'executeQuery',
      query: "=INSERT INTO promos_log (item_id, decision, reason) VALUES ('{{ $('Extrair Ofertas do Catalogo').item.json.item_id }}', '{{ $json.decision ? $json.decision : ($json.item_id ? 'aceito' : 'duplicado') }}', '{{ $json.reason_repost ? $json.reason_repost : $('Extrair Ofertas do Catalogo').item.json.reason }}');"
    },
    credentials: { postgres: newCredential('Pokemon Promos DB') }
  }
});

const logErroInsert = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Log Erro de Insert Catalogo',
    position: [2720, 240],
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'executeQuery',
      query: "=INSERT INTO promos_erros (item_id, payload, error_step, error_msg) VALUES ('{{ $('Extrair Ofertas do Catalogo').item.json.item_id }}', '{{ $('Extrair Ofertas do Catalogo').item.json.payload_erro }}'::jsonb, 'catalogo', '{{ String($json.error || 'falha ao inserir promo vinda do catalogo').split(String.fromCharCode(39)).join(String.fromCharCode(39) + String.fromCharCode(39)).slice(0, 400) }}');"
    },
    credentials: { postgres: newCredential('Pokemon Promos DB') }
  }
});

const logDescartado = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Log Descartado Catalogo',
    position: [2480, 380],
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'executeQuery',
      query: "=INSERT INTO promos_log (item_id, decision, reason) VALUES ('{{ $json.item_id }}', 'descartado', '{{ $json.reason }}');"
    },
    credentials: { postgres: newCredential('Pokemon Promos DB') }
  }
});

const logVarredura = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Log Varredura Catalogo',
    position: [2480, 540],
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'executeQuery',
      query: "=INSERT INTO promos_log (item_id, decision, reason) VALUES (NULL, 'varredura_catalogo', '{{ $('Extrair Ofertas do Catalogo').item.json.reason }}');"
    },
    credentials: { postgres: newCredential('Pokemon Promos DB') }
  }
});

const logParser = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Log Parser Quebrado Catalogo',
    position: [2480, 700],
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'executeQuery',
      query: "=INSERT INTO promos_erros (item_id, payload, error_step, error_msg) VALUES (NULL, '{{ $json.payload_json }}'::jsonb, 'catalogo', '{{ $json.error_msg }}');"
    },
    credentials: { postgres: newCredential('Pokemon Promos DB') }
  }
});

const notaCredencial = sticky({
  content: 'Credencial ScraperAPI: crie Query Auth com parametro api_key e nome ScraperAPI Query Auth. Sem isso a HTTP falha. Workflow nasce INATIVO. TESTE_SO_POKEMON=true no node Filtrar Loja de Teste (10 creditos).',
  config: { name: 'Nota credencial', position: [240, 40], width: 420, height: 220 }
});

const notaCusto = sticky({
  content: 'Custo: pagina 1 com render=true = 10 creditos/loja. Nao misturar no Store Scanner de 5 min. Cron 07:00 no relogio do n8n (America/Sao_Paulo). Pagina 2+ fora desta versao.',
  config: { name: 'Nota custo', position: [720, 40], width: 380, height: 220 }
});

inserir.onError(logErroInsert);

export default workflow('pokemon-catalog-scanner', 'Pokemon Catalog Scanner')
  .add(notaCredencial)
  .add(notaCusto)
  .add(manual)
  .to(jitter)
  .add(diario)
  .to(jitter)
  .to(buscarPromos)
  .to(buscarLojas)
  .to(filtrarLoja)
  .to(baixar)
  .to(extrair)
  .to(injetar)
  .to(rotear
    .onCase(0, inserir.to(logAceito))
    .onCase(1, logDescartado)
    .onCase(2, logVarredura)
    .onCase(3, logParser)
  );
