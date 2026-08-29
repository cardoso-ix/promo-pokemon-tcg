// Replica WhatsApp Ingest -> node "Separar Links a Resolver" (Code, runOnceForAllItems)
// Vira a lista em um item por link, porque o node de HTTP roda uma vez por item.
// A ordem dos itens e o que amarra cada resposta ao link de origem no "Montar Post".

const dados = $('Extrair Links').first().json;
const urls = dados.links_a_resolver || [];

return urls.map(function (url, indice) {
  return { json: { indice: indice, url: url } };
});
