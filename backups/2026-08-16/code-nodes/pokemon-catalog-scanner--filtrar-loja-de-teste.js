// true = so a loja pokemon (10 creditos). false = todas as lojas ativas.
const TESTE_SO_POKEMON = true;
const items = $input.all();
if (!TESTE_SO_POKEMON) return items;
return items.filter(function (it) {
  return it && it.json && String(it.json.slug) === 'pokemon';
});
