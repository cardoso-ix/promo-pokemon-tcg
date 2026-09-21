import assert from 'node:assert';
import { test } from 'node:test';
import { extractCanonicalProductId } from '../src/core/affiliate.js';
import {
  initDatabase,
  registrarProdutoReplicado,
  consultarCooldownProduto
} from '../src/db/database.js';

test('extractCanonicalProductId extrai ID único do Mercado Livre', () => {
  // Caso 1: URL de catálogo com /p/MLB...
  const url1 = 'https://www.mercadolivre.com.br/deck-pokemon-espada-e-escudo-rillaboom-copag/p/MLB27197917';
  assert.strictEqual(extractCanonicalProductId(url1), 'MLB27197917');

  // Caso 2: URL de anúncio direto MLB-
  const url2 = 'https://produto.mercadolivre.com.br/MLB-356981234-box-pokemon-charizard-_JM';
  assert.strictEqual(extractCanonicalProductId(url2), 'MLB356981234');

  // Caso 3: URL com up/MLBU...
  const url3 = 'https://www.mercadolivre.com.br/item/up/MLBU987654321';
  assert.strictEqual(extractCanonicalProductId(url3), 'MLBU987654321');

  // Caso 4: URL curta ou desconhecida
  const url4 = 'https://google.com';
  assert.strictEqual(extractCanonicalProductId(url4), null);
});

test('Cooldown Cross-Group - Bloqueia post repetido entre grupos diferentes em menos de 5 min', () => {
  initDatabase();

  const prodId = `TEST_MLB_${Date.now()}`;

  // Grupo A posta o produto às 14:00 por R$ 250
  const cooldownAntes = consultarCooldownProduto(prodId, 250, 5);
  assert.strictEqual(cooldownAntes.emCooldown, false);

  registrarProdutoReplicado(prodId, 'grupoA@g.us', 'Grupo A Monitorado', 250);

  // Grupo B posta o MESMO produto 1 minuto depois pelo mesmo preço
  const cooldownGrupoB = consultarCooldownProduto(prodId, 250, 5);
  assert.strictEqual(cooldownGrupoB.emCooldown, true);
  assert.strictEqual(cooldownGrupoB.postadoPor, 'Grupo A Monitorado');

  // Grupo C posta o mesmo produto, mas com QUEDA DE PREÇO significativa (ex: R$ 190 vs R$ 250)
  const cooldownQuedaPreco = consultarCooldownProduto(prodId, 190, 5);
  assert.strictEqual(cooldownQuedaPreco.emCooldown, false);
  assert.strictEqual(cooldownQuedaPreco.motivo, 'queda_de_preco');
});
