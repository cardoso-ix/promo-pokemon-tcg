// Replica WhatsApp Ingest -> node "Normalizar URL da Foto"
const prep = $('Preparar Card').first().json;
const item = $input.first().json || {};
const fotos = Array.isArray(item.pictures) ? item.pictures : [];
const primeira = fotos[0] || {};
const url = String(primeira.secure_url || primeira.url || item.secure_thumbnail || item.thumbnail || '');
const ok = /^https?:\/\//i.test(url);
const origem = $('Montar Post').first().json;

return [{
  json: {
    titulo: prep.titulo || String(item.title || '').slice(0, 42),
    preco_de: prep.preco_de,
    preco_por: prep.preco_por,
    cupom: prep.cupom,
    linha_marca: prep.linha_marca,
    linha_de: prep.linha_de,
    linha_por: prep.linha_por,
    linha_cupom: prep.linha_cupom,
    item_id: prep.item_id,
    url_foto_card: ok ? url : '',
    tem_url_foto: ok,
    fallback_origem: !ok && origem.tem_imagem === true,
    montar_card: ok || origem.tem_imagem === true,
    texto_publicado: prep.texto_publicado,
    usar_foto: true,
  },
}];
