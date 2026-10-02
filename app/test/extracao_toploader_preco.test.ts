import test from 'node:test';
import assert from 'node:assert/strict';
import { extrairDadosOferta } from '../src/core/sheets.js';

test('extrairDadosOferta não deve considerar linha "👉 POR: R$37" como nome de produto', () => {
  const mensagem = `⚠️ 25 Toploader Cristal

❌ DE: R$45
👉 POR: R$37

@rasgabooster.tcg

https://meli.la/17W23AJ`;

  const dados = extrairDadosOferta(mensagem, 'https://meli.la/17W23AJ');

  // Não pode ser POR: R$37
  assert.notEqual(dados.produto, 'POR: R$37');
  assert.notEqual(dados.produto, 'POR: R$ 37');
  assert.ok(!dados.produto.toLowerCase().includes('por:'), 'Nome do produto não pode conter POR:');

  // O produto correto deve ser Toploader Cristal
  assert.ok(dados.produto.toLowerCase().includes('toploader'), `Esperado toploader no produto, obtido: "${dados.produto}"`);
  assert.ok(dados.valorDe.includes('45'), `Esperado 45 no valorDe, obtido: "${dados.valorDe}"`);
  assert.ok(dados.valorPor.includes('37'), `Esperado 37 no valorPor, obtido: "${dados.valorPor}"`);
});

test('extrairDadosOferta não deve considerar linhas de preço com emojis variados como nome de produto', () => {
  const exemplosPreco = [
    '👉 POR: R$37',
    '👉🏼 POR: R$ 89',
    '🔥 POR APENAS: R$ 120',
    '✅ POR: R$ 50',
    '🛒 POR R$ 35',
    '❌ DE: R$ 60',
    '💰 VALOR: R$ 99'
  ];

  for (const ex of exemplosPreco) {
    const msg = `Display Box Pokémon\n${ex}\nhttps://meli.la/test`;
    const dados = extrairDadosOferta(msg);
    assert.notEqual(dados.produto, ex);
    assert.ok(!dados.produto.toLowerCase().includes('por:'), `Produto não deve ser preço: ${dados.produto}`);
    assert.ok(dados.produto.toLowerCase().includes('display'), `Deve selecionar o produto real: ${dados.produto}`);
  }
});
