// Replica WhatsApp Ingest -> node "Separar Destinos WhatsApp"
const post = $('Montar Post').first().json;
const destinos = post.destinos_whatsapp || [];

if (!destinos.length) {
  return [{ json: { pular: true } }];
}

function base64Puro(valor) {
  const s = String(valor || '');
  const i = s.indexOf('base64,');
  return (i >= 0 ? s.slice(i + 7) : s).replace(/\s+/g, '');
}

function mediaDeBinario(nomeNode) {
  try {
    const item = $(nomeNode).first();
    const bin = (item && item.binary) ? item.binary : {};
    const chave = bin.data ? 'data' : (bin.produto ? 'produto' : '');
    if (!chave || !bin[chave] || !bin[chave].data) return { media: '', mimetype: 'image/jpeg' };
    return {
      media: String(bin[chave].data).replace(/\s+/g, ''),
      mimetype: String(bin[chave].mimeType || 'image/jpeg'),
    };
  } catch (e) {
    return { media: '', mimetype: 'image/jpeg' };
  }
}

let escolhida = mediaDeBinario('Escrever Textos do Card');
if (escolhida.media.length <= 80) escolhida = mediaDeBinario('Colar Foto no Card');
if (escolhida.media.length <= 80) escolhida = mediaDeBinario('Criar Fundo do Card');

if (escolhida.media.length <= 80) {
  try {
    const img = $('Baixar Imagem da Evolution').first().json || {};
    escolhida = {
      media: base64Puro(img.base64 || img.data || ''),
      mimetype: String(img.mimetype || 'image/jpeg'),
    };
  } catch (e) {}
}

const usarFoto = escolhida.media.length > 80;

return destinos.map(function (d) {
  return {
    json: {
      pular: false,
      number: d.identificador,
      text: post.texto_publicado,
      media: usarFoto ? escolhida.media : '',
      mimetype: escolhida.mimetype,
      usar_foto: usarFoto,
    },
  };
});
