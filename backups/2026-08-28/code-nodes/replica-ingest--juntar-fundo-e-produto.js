// Replica WhatsApp Ingest -> node "Juntar Fundo e Produto"
const fundo = $('Criar Fundo do Card').first();
const foto = $('Redimensionar Foto').first();
const prep = $('Preparar Card').first().json;
if (!fundo.binary || !fundo.binary.data) throw new Error('fundo do card ausente');
if (!foto.binary || !foto.binary.produto) throw new Error('foto do produto ausente');
return [{
  json: Object.assign({}, foto.json, prep, { usar_foto: true }),
  binary: { data: fundo.binary.data, produto: foto.binary.produto },
}];
