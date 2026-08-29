// Replica WhatsApp Ingest -> node "Unificar Binario do Card"
// Copia a foto (ML ou origem) para binary.produto e devolve os textos do card.

const prep = $('Preparar Card').first().json;
let extra = {};
try { extra = $('Normalizar URL da Foto').first().json || {}; } catch (e) { extra = {}; }

const item = $input.first();
const bin = item.binary || {};
const chave = bin.data ? 'data' : Object.keys(bin)[0];
if (!chave || !bin[chave]) {
  throw new Error('sem binario de foto para o card');
}

const saida = {
  json: {
    titulo: extra.titulo || prep.titulo,
    preco_de: extra.preco_de || prep.preco_de,
    preco_por: extra.preco_por || prep.preco_por,
    cupom: extra.cupom || prep.cupom,
    linha_marca: prep.linha_marca,
    linha_de: extra.linha_de || prep.linha_de,
    linha_por: extra.linha_por || prep.linha_por,
    linha_cupom: extra.linha_cupom || prep.linha_cupom,
    texto_publicado: prep.texto_publicado,
    usar_foto: true,
  },
  binary: {
    produto: bin[chave],
  },
};

return [saida];
