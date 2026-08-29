// Replica WhatsApp Ingest -> node "Preparar Card"
// Decide se da para montar um card profissional e extrai titulo, DE, POR e cupom
// do texto ja limpo. Foto preferida: thumbnail do anuncio no ML. Sem item, usa a
// foto da origem. Sem as duas, o post segue so texto (cupom sem produto).

function limparMarca(texto) {
  return String(texto || '')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function acharPreco(texto) {
  const m = /R\$\s*[\d.]{1,8}(?:,\d{1,2})?/i.exec(String(texto || ''));
  return m ? m[0].replace(/\s+/g, ' ').trim() : '';
}

function quebrarTitulo(texto, max) {
  const limpo = limparMarca(texto).slice(0, 90);
  if (limpo.length <= max) return limpo;
  const corte = limpo.lastIndexOf(' ', max);
  return (corte > 20 ? limpo.slice(0, corte) : limpo.slice(0, max)).trim();
}

const post = $('Montar Post').first().json;
const linhas = String(post.texto_publicado || '').split('\n');

let titulo = '';
let precoDe = '';
let precoPor = '';
let cupom = '';

for (let i = 0; i < linhas.length; i++) {
  const bruta = String(linhas[i] || '').trim();
  if (!bruta) continue;
  const limpa = limparMarca(bruta);
  const lower = limpa.toLowerCase();

  if (/^https?:\/\//i.test(limpa)) continue;
  if (lower.indexOf('compre aqui') !== -1 || lower.indexOf('resgatem') !== -1) continue;

  if (!precoDe && (lower.indexOf('de:') === 0 || /(?:^| )de[:\s]/i.test(lower) || bruta.indexOf('❌') !== -1)) {
    precoDe = acharPreco(limpa);
  } else if (!precoPor && (lower.indexOf('por:') === 0 || /(?:^| )por[:\s]/i.test(lower) || bruta.indexOf('👉') !== -1 || bruta.indexOf('✅') !== -1)) {
    precoPor = acharPreco(limpa);
  } else if (!cupom && lower.indexOf('cupom') !== -1) {
    const codigo = /cupom[:\s]+([A-Za-z0-9]{3,20})/i.exec(limpa);
    cupom = codigo ? codigo[1].toUpperCase() : '';
  } else if (!titulo && limpa.length > 4) {
    titulo = quebrarTitulo(limpa, 42);
  }
}

if (!precoPor) {
  for (let i = 0; i < linhas.length; i++) {
    if (!precoPor) precoPor = acharPreco(linhas[i]);
  }
}

const itemId = String(post.item_ids || '').split(',')[0].trim().toUpperCase();
const temItem = /^MLB\d+$/.test(itemId);
const temOrigem = post.tem_imagem === true;
const fonteFoto = temItem ? 'ml' : (temOrigem ? 'origem' : 'nenhuma');

return [{
  json: {
    titulo: titulo || 'Oferta Pokemon TCG',
    preco_de: precoDe,
    preco_por: precoPor,
    cupom: cupom,
    linha_marca: 'POKEMON TCG PROMO',
    linha_de: precoDe ? ('DE  ' + precoDe) : '',
    linha_por: precoPor ? ('POR  ' + precoPor) : '',
    linha_cupom: cupom ? ('CUPOM  ' + cupom) : '',
    item_id: itemId,
    url_item: temItem ? ('https://api.mercadolibre.com/items/' + itemId) : '',
    fonte_foto: fonteFoto,
    montar_card: fonteFoto !== 'nenhuma',
    tem_imagem_origem: temOrigem,
    texto_publicado: post.texto_publicado,
    usar_foto: post.usar_foto === true || fonteFoto !== 'nenhuma',
  },
}];
