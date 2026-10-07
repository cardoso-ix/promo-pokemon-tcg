import { test } from 'node:test';
import assert from 'node:assert';
import { isMagazineLuiza, isAmazonUrl, isMercadoLivreUrl } from '../src/core/affiliate.js';

test('isMagazineLuiza deve identificar corretamente todos os links e domínios da Magazine Luiza / Magalu', () => {
  const urlsMagalu = [
    'https://www.magazineluiza.com.br/blister-pokemon-tcg/p/1234567/',
    'http://magazineluiza.com/produto/999',
    'https://magalu.me/promocao-pokemon',
    'https://maga.lu/3xYzA1',
    'https://www.magazinevoce.com.br/magazinedd/blister-pokemon/p/456/',
    'https://parceiromagalu.com.br/oferta-tcg'
  ];

  for (const url of urlsMagalu) {
    assert.strictEqual(isMagazineLuiza(url), true, `Deveria identificar como Magalu: ${url}`);
  }
});

test('isMagazineLuiza deve identificar menções textuais à marca Magazine Luiza / Magalu mesmo sem link', () => {
  const mensagensTexto = [
    '🔥 Aproveitem galera, cupom especial de 10% no Magazine Luiza!',
    'Olha essa oferta que acabou de sair no Magalu',
    'Compre pelo App Magalu para ganhar frete grátis',
    'Preço promocional válido pelo parceiro magalu',
    'Magazine Você com desconto imperdível em Pokémon TCG',
    'CUPOM MAGALU20 ATIVO HOJE'
  ];

  for (const msg of mensagensTexto) {
    assert.strictEqual(isMagazineLuiza(msg), true, `Deveria identificar menção textual Magalu: ${msg}`);
  }
});

test('isMagazineLuiza NÃO deve acusar falsos positivos para Mercado Livre, Amazon ou mensagens normais', () => {
  const mensagensValidas = [
    '🔥 Box Charizard Ex no Mercado Livre: https://mercadolivre.com/sec/2a3b4c',
    'Super oferta Pokémon TCG na Amazon: https://amzn.to/3pokemon',
    'Blister Triplo Copag Fogo Fantasmagórico disponível!',
    'https://produto.mercadolivre.com.br/MLB-123456-pokemon-tcg_JM',
    'https://www.amazon.com.br/dp/B0DJTESTE'
  ];

  for (const msg of mensagensValidas) {
    assert.strictEqual(isMagazineLuiza(msg), false, `NÃO deveria marcar como Magalu: ${msg}`);
  }
});

test('Validação de Roteamento: Amazon é identificada para teste e Mercado Livre para oficial', () => {
  const linkAmazon = 'https://amzn.to/3pokemon';
  const linkMeli = 'https://mercadolivre.com/sec/2a3b4c';

  assert.strictEqual(isAmazonUrl(linkAmazon), true);
  assert.strictEqual(isMercadoLivreUrl(linkAmazon), false);

  assert.strictEqual(isMercadoLivreUrl(linkMeli), true);
  assert.strictEqual(isAmazonUrl(linkMeli), false);

  assert.strictEqual(isMagazineLuiza(linkAmazon), false);
  assert.strictEqual(isMagazineLuiza(linkMeli), false);
});
