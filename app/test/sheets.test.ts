import assert from 'node:assert';
import { test } from 'node:test';
import { extrairDadosOferta } from '../src/core/sheets.js';

test('extrairDadosOferta deve extrair dados de oferta com DE e POR clássicos', () => {
  const mensagem = `Box Pokémon Mega Lucario Ex Mega Evolução - Copag Mega Lucario Português

❌ ~DE: R$180~
👉🏼 *POR: R$124*

🔗https://meli.la/1ejomo4
_@rasgabooster.tcg_`;

  const oferta = extrairDadosOferta(mensagem, 'https://mercadolivre.com.br/box-pokemon-mega-lucario-ex', 'Grupo VIP TCG');

  assert.strictEqual(oferta.produto, 'Box Pokémon Mega Lucario Ex Mega Evolução - Copag Mega Lucario Português');
  assert.strictEqual(oferta.valorPor, 'R$ 124');
  assert.strictEqual(oferta.valorDe, 'R$ 180');
  assert.strictEqual(oferta.link, 'https://meli.la/1ejomo4');
  assert.strictEqual(oferta.grupo, 'Grupo VIP TCG');
  assert.ok(oferta.data.length > 0);
});

test('extrairDadosOferta deve extrair dados com emojis e marcadores estilizados preservando bandeira', () => {
  const mensagem = `🇧🇷 *Box Estampas Ilustradas Pokémon Copag Coleção Treinador Avançado Caos Ascendente Português com 20 mazos*

De *R$ 397* ❌
Por *R$ 330* ✅

Loja Verificada no ML
https://meli.la/2S6b4wn`;

  const oferta = extrairDadosOferta(mensagem, undefined, 'Grupo Promoções');

  assert.strictEqual(oferta.produto, '🇧🇷 Box Estampas Ilustradas Pokémon Copag Coleção Treinador Avançado Caos Ascendente Português com 20 mazos');
  assert.strictEqual(oferta.valorPor, 'R$ 330');
  assert.strictEqual(oferta.valorDe, 'R$ 397');
  assert.strictEqual(oferta.link, 'https://meli.la/2S6b4wn');
  assert.strictEqual(oferta.grupo, 'Grupo Promoções');
});

test('extrairDadosOferta deve preservar bandeira de país no produto (ex: 🇺🇸 Poster Collection)', () => {
  const mensagem = `visite a pagina e encontre todos os produtos de CLUB PROMOCOES em um meli.la

🇺🇸 ✨ 30 ANOS - POSTER COLLECTION

É em inglês e tá acompanhando o menor da liga 🧐

👉 Por R$319
🏷 Cupom: MELIUZKIDS

🔗 https://meli.la/14kn6gv`;

  const oferta = extrairDadosOferta(mensagem, undefined, 'Canal Importados');

  assert.strictEqual(oferta.produto, '🇺🇸 30 ANOS - POSTER COLLECTION');
  assert.strictEqual(oferta.valorPor, 'R$ 319');
  assert.strictEqual(oferta.link, 'https://meli.la/14kn6gv');
});

test('extrairDadosOferta deve extrair do gerador de anúncios oficial', () => {
  const mensagem = `🔥 *SUPER PROMOÇÃO POKÉMON TCG!* 🔥

📦 *Coleção Especial Charizard Ex Premium*

❌ ~De: R$ 349,90~
👉 *Por apenas: R$ 269,90*

⚡ Produto original com estoque e envio rápido!

🛒 *Compre com desconto exclusivo aqui:*
👉 https://meli.la/3xpto12`;

  const oferta = extrairDadosOferta(mensagem, undefined, 'Gerador Manual');

  assert.strictEqual(oferta.produto, 'Coleção Especial Charizard Ex Premium');
  assert.strictEqual(oferta.valorPor, 'R$ 269,90');
  assert.strictEqual(oferta.valorDe, 'R$ 349,90');
  assert.strictEqual(oferta.link, 'https://meli.la/3xpto12');
  assert.strictEqual(oferta.grupo, 'Gerador Manual');
});

test('extrairDadosOferta deve usar fallback de slug quando mensagem não tem título limpo', () => {
  const mensagem = `Apenas R$ 89,90 hoje! Aproveite o frete grátis:
https://meli.la/12345`;

  const resolvedUrl = 'https://produto.mercadolivre.com.br/lata-colecionavel-mewtwo-ex-copag-pokemon-tcg/p/MLB123456';

  const oferta = extrairDadosOferta(mensagem, resolvedUrl, 'Canal TCG');

  assert.ok(oferta.produto.includes('Pokémon') || oferta.produto.includes('Mewtwo') || oferta.produto.includes('Copag'));
  assert.strictEqual(oferta.valorPor, 'R$ 89,90');
});

test('extrairDadosOferta NÃO deve extrair porcentagem de cupom como preço De', () => {
  const mensagem = `🚨 *CUPOM DE 15% DE DESCONTO!*

Todos os produtos enviados estão com *preços excelentes*! 🔥
Não perca tempo e garanta o seu *antes que esgote!* 🛒 ⚡
@all`;

  const oferta = extrairDadosOferta(mensagem, undefined, 'Grupo Concorrente');

  assert.strictEqual(oferta.valorDe, '');
  assert.strictEqual(oferta.valorPor, 'Consultar');
});
