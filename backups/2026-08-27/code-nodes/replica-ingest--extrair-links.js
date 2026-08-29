// Replica WhatsApp Ingest -> node "Extrair Links" (Code, runOnceForAllItems)
// Acha as URLs do texto original e classifica cada uma. Quem decide se publica e o
// "Montar Post"; aqui so se descobre o que precisa passar pelo resolvedor de redirect.

const MAX_LINKS_A_RESOLVER = 4;

const DOMINIOS_ML = ['mercadolivre.com.br', 'mercadolibre.com', 'mercadolivre.com'];
const ENCURTADORES_ML = ['meli.la', 'mlb.to'];

const ENCURTADORES = [
  'mlb.to', 'meli.la', 'bit.ly', 'tinyurl.com', 'cutt.ly', 'encurtador.com.br', 'is.gd',
  'goo.gl', 't.co', 'ow.ly', 'rebrand.ly', 'shorturl.at', 'abre.ai', 'acesse.one',
  'l1nq.com', 'linktr.ee', 'shorturl.gg', 'bitly.com',
];

const OUTROS_MARKETPLACES = [
  'amazon.com', 'amzn.to', 'shopee.com', 'shope.ee', 'aliexpress.com', 's.click.aliexpress.com',
  'magazineluiza.com', 'magalu.com', 'americanas.com', 'casasbahia.com', 'pontofrio.com',
  'kabum.com', 'terabyteshop.com', 'pichau.com', 'netshoes.com', 'centauro.com',
  'submarino.com', 'carrefour.com', 'temu.com', 'sheiin.com', 'shein.com', 'nike.com.br',
];

const CONVITES = ['chat.whatsapp.com', 't.me', 'wa.me', 'api.whatsapp.com', 'telegram.me'];

function limparPontuacaoFinal(url) {
  return url.replace(/[),.;:!?"']+$/, '');
}

function hostDe(url) {
  const m = /^https?:\/\/([^/?#]+)/i.exec(url);
  return m ? m[1].toLowerCase().replace(/^www\./, '') : '';
}

function terminaCom(host, lista) {
  return lista.some(function (d) { return host === d || host.endsWith('.' + d); });
}

function ehProdutoML(url) {
  return /\/MLB-?\d{6,}/i.test(url) || /\/p\/MLB\d+/i.test(url);
}

const norm = $('Normalizar Mensagem').first().json;
const texto = String(norm.texto || '');

const encontradas = texto.match(/https?:\/\/[^\s<>"']+/gi) || [];

const vistos = {};
const links = [];

for (let i = 0; i < encontradas.length; i++) {
  const url = limparPontuacaoFinal(encontradas[i]);
  if (!url || vistos[url]) continue;
  vistos[url] = true;

  const host = hostDe(url);
  let tipo = 'desconhecido';
  let precisaResolver = false;

  if (terminaCom(host, CONVITES)) {
    tipo = 'convite';
  } else if (terminaCom(host, OUTROS_MARKETPLACES)) {
    tipo = 'outro_marketplace';
  } else if (terminaCom(host, DOMINIOS_ML) || terminaCom(host, ENCURTADORES_ML)) {
    if (ehProdutoML(url)) {
      tipo = 'ml_produto';
    } else {
      tipo = 'ml_encurtado';
      precisaResolver = true;
    }
  } else if (terminaCom(host, ENCURTADORES)) {
    tipo = 'encurtador';
    precisaResolver = true;
  } else {
    tipo = 'desconhecido';
    precisaResolver = true;
  }

  links.push({ url: url, host: host, tipo: tipo, precisa_resolver: precisaResolver });
}

const aResolver = links.filter(function (l) { return l.precisa_resolver; }).slice(0, MAX_LINKS_A_RESOLVER);

return [{
  json: {
    links: links,
    total_links: links.length,
    links_a_resolver: aResolver.map(function (l) { return l.url; }),
    tem_link_a_resolver: aResolver.length > 0,
  },
}];
