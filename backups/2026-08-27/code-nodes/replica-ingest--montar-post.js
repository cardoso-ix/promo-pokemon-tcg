// Replica WhatsApp Ingest -> node "Montar Post" (Code, runOnceForAllItems)
// Copia o texto do grupo de origem e troca SO os links do Mercado Livre pelo link de
// afiliado do Eduardo. Produto (/p/MLB ou /MLB-123) vira permalink + matt_word.
// Cupom/lista/perfil de terceiro (/social/outra-pessoa) vira a vitrine do Eduardo.
// Tambem apaga convite de terceiro e marca (@rasgabooster.tcg, #rasgaboot).
//
// Recebe dois caminhos possiveis (com e sem resolucao de encurtador), por isso todo
// acesso a node de resolucao esta protegido por try/catch.

const DOMINIOS_ML = ['mercadolivre.com.br', 'mercadolibre.com', 'mercadolivre.com'];
const ENCURTADORES_ML = ['meli.la', 'mlb.to'];
const OUTROS_MARKETPLACES = [
  'amazon.com', 'amzn.to', 'shopee.com', 'shope.ee', 'aliexpress.com',
  'magazineluiza.com', 'magalu.com', 'americanas.com', 'casasbahia.com', 'pontofrio.com',
  'kabum.com', 'terabyteshop.com', 'pichau.com', 'netshoes.com', 'centauro.com',
  'submarino.com', 'carrefour.com', 'temu.com', 'shein.com', 'nike.com.br',
];
const CONVITES = ['chat.whatsapp.com', 't.me', 'wa.me', 'api.whatsapp.com', 'telegram.me'];

const LIMITE_LEGENDA_TELEGRAM = 1000;

const MARCAS_PADRAO = [
  '@rasgabooster.tcg',
  '@rasgabooster',
  '#rasgaboot',
  '#rasgabooster',
  'rasgabooster.tcg',
];

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
  return 'https://www.mercadolivre.com.br/social/' + apelido
    + '?matt_word=' + apelido + '&matt_tool=' + etiqueta + '&forceInApp=true';
}

function itemIdDe(url) {
  const produto = /\/p\/(MLB\d+)/i.exec(url);
  if (produto) return produto[1].toUpperCase();
  const anuncio = /\/MLB-?(\d{6,})/i.exec(url);
  if (anuncio) return 'MLB' + anuncio[1];
  return '';
}

function trocarTudo(texto, de, para) {
  return texto.split(de).join(para);
}

function escaparRegExp(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function frasesExtras(cfg) {
  return String(cfg.frases_remover || '')
    .split(/[\n,;]+/)
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
}

function limparMarcasTerceiro(texto, extras) {
  const marcas = MARCAS_PADRAO.concat(extras).filter(Boolean);
  const unicas = [];
  for (let i = 0; i < marcas.length; i++) {
    const atual = marcas[i];
    const jaTem = unicas.some(function (m) { return m.toLowerCase() === atual.toLowerCase(); });
    if (!jaTem) unicas.push(atual);
  }

  return texto
    .split('\n')
    .map(function (linha) {
      return linha.replace(/[_*]{1,2}(@[\w.]+)[_*]{1,2}/g, '$1');
    })
    .filter(function (linha) {
      const limpa = linha.replace(/[*_~`]/g, '').replace(/\s+/g, ' ').trim();
      if (!limpa) return true;
      if (/^@[\w.]+$/.test(limpa)) return false;
      if (/^#[\w.]+$/.test(limpa)) return false;
      const lower = limpa.toLowerCase();
      for (let i = 0; i < unicas.length; i++) {
        const marca = unicas[i].toLowerCase();
        const semPrefixo = marca.replace(/^[@#]/, '');
        if (lower === marca || lower === semPrefixo) return false;
        if (lower.indexOf(marca) !== -1 && limpa.length <= marca.length + 8) return false;
      }
      return true;
    })
    .map(function (linha) {
      let t = linha;
      for (let i = 0; i < unicas.length; i++) {
        t = t.replace(new RegExp(escaparRegExp(unicas[i]), 'gi'), '');
      }
      return t.replace(/[ \t]+$/g, '');
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizarParaHash(texto) {
  return String(texto)
    .replace(/https?:\/\/[^\s<>"']+/gi, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9áàâãéêíóôõúüç ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashConteudo(material) {
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) {
    h ^= material.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8) + '-' + material.length;
}

function ehCupom(texto) {
  const t = String(texto).toLowerCase();
  const pistas = ['cupom', 'cupons', 'cupon', 'codigo', 'código', 'coupon', 'desconto extra'];
  return pistas.some(function (p) { return t.indexOf(p) !== -1; });
}

const norm = $('Normalizar Mensagem').first().json;
const cfg = $('Consultar Rota e Config').first().json;
const extraidos = $('Extrair Links').first().json;

let pedidos = [];
let hop1 = [];
let hop2 = [];
try { pedidos = $('Separar Links a Resolver').all().map(function (i) { return i.json.url; }); } catch (e) { pedidos = []; }
try { hop1 = $('Seguir Redirecionamento 1').all().map(function (i) { return i.json; }); } catch (e) { hop1 = []; }
try { hop2 = $('Seguir Redirecionamento 2').all().map(function (i) { return i.json; }); } catch (e) { hop2 = []; }

function localizacao(resposta) {
  if (!resposta || !resposta.headers) return '';
  const h = resposta.headers;
  const valor = h.location || h.Location || '';
  return typeof valor === 'string' && /^https?:\/\//i.test(valor) ? valor : '';
}

const destinoFinal = {};
for (let i = 0; i < pedidos.length; i++) {
  destinoFinal[pedidos[i]] = localizacao(hop2[i]) || localizacao(hop1[i]) || pedidos[i];
}

const apelido = String(cfg.matt_word || '');
const etiqueta = String(cfg.matt_tool || '');

let texto = String(norm.texto || '');
let convertidos = 0;
let temOutroMarketplace = false;
const itemIds = [];
const linhasParaRemover = [];

const links = extraidos.links || [];
for (let i = 0; i < links.length; i++) {
  const link = links[i];

  if (link.tipo === 'convite') {
    linhasParaRemover.push(link.url);
    continue;
  }

  const final = destinoFinal[link.url] || link.url;
  const hostFinal = hostDe(final);

  const veioDoMeli = terminaCom(hostFinal, DOMINIOS_ML) || terminaCom(hostDe(link.url), ENCURTADORES_ML);
  if (veioDoMeli && apelido) {
    const id = itemIdDe(final) || itemIdDe(link.url);
    if (id) {
      texto = trocarTudo(texto, link.url, montarLinkAfiliado(final, apelido, etiqueta));
      convertidos += 1;
      if (itemIds.indexOf(id) === -1) itemIds.push(id);
    } else {
      texto = trocarTudo(texto, link.url, montarLinkSocialProprio(apelido, etiqueta));
      convertidos += 1;
    }
  } else if (terminaCom(hostFinal, OUTROS_MARKETPLACES)) {
    temOutroMarketplace = true;
  }
}

if (linhasParaRemover.length > 0) {
  texto = texto
    .split('\n')
    .filter(function (linha) {
      return !linhasParaRemover.some(function (url) { return linha.indexOf(url) !== -1; });
    })
    .join('\n');
}

texto = limparMarcasTerceiro(texto, frasesExtras(cfg));
texto = texto.replace(/\n{4,}/g, '\n\n\n').trim();

const cupom = ehCupom(norm.texto);
const cupomLiberado = String(cfg.cupom_sem_link || 'false') === 'true';

let publicar = false;
let status = 'descartado';
let motivo = '';

if (convertidos > 0) {
  publicar = true;
  status = 'pendente';
} else if (temOutroMarketplace) {
  motivo = 'so_tinha_link_de_outro_marketplace';
} else if (cupom && cupomLiberado) {
  publicar = true;
  status = 'pendente';
  motivo = 'cupom_sem_link_de_produto';
} else {
  motivo = 'sem_link_do_mercado_livre';
}

if (publicar && !texto.trim()) {
  publicar = false;
  status = 'descartado';
  motivo = 'texto_vazio_depois_da_limpeza';
}

const material = normalizarParaHash(texto) + '|' + itemIds.join(',');

let destinos = [];
try {
  destinos = Array.isArray(cfg.destinos) ? cfg.destinos : JSON.parse(cfg.destinos || '[]');
} catch (e) {
  destinos = [];
}
if (!destinos.length && cfg.destino) {
  destinos = [{ plataforma: 'telegram', identificador: cfg.destino, nome: cfg.destino }];
}
const destinosTelegram = destinos.filter(function (d) { return d && d.plataforma === 'telegram' && d.identificador; });
const destinosWhatsapp = destinos.filter(function (d) { return d && d.plataforma === 'whatsapp' && d.identificador; });
const destinoTelegram = destinosTelegram.length ? destinosTelegram[0].identificador : (cfg.destino || '');

if (publicar && !destinosTelegram.length && !destinosWhatsapp.length) {
  publicar = false;
  status = 'descartado';
  motivo = 'sem_destino_configurado';
}

return [{
  json: {
    origem_chat_id: norm.chat_id,
    origem_nome: cfg.nome || '',
    origem_message_id: norm.mensagem_id,
    hash_conteudo: hashConteudo(material),
    texto_original: norm.texto,
    texto_publicado: texto,
    links_convertidos: convertidos,
    item_ids: itemIds.join(','),
    tem_imagem: norm.tem_imagem === true,
    baixar_foto: norm.tem_imagem === true,
    usar_foto: norm.tem_imagem === true && texto.length <= LIMITE_LEGENDA_TELEGRAM,
    destino: destinoTelegram,
    destinos_telegram: destinosTelegram,
    destinos_whatsapp: destinosWhatsapp,
    tem_destino_telegram: destinosTelegram.length > 0,
    tem_destino_whatsapp: destinosWhatsapp.length > 0,
    delay_segundos: Number(cfg.delay_segundos || 8),
    url_midia: norm.servidor + '/chat/getBase64FromMediaMessage/' + norm.instancia,
    corpo_midia: JSON.stringify({
      message: { key: { id: norm.mensagem_id, remoteJid: norm.chat_id, fromMe: false } },
      convertToMp4: false,
    }),
    publicar: publicar,
    status: status,
    motivo: motivo,
  },
}];
