import assert from 'node:assert';
import { test } from 'node:test';
import { isProdutoTCG } from '../src/core/anuncio.js';

test('Guardião de Nicho TCG - Aceita produtos de Pokémon TCG', () => {
  assert.strictEqual(isProdutoTCG('Booster Box Pokémon Escarlate e Violeta Copag', 'Box Pokémon'), true);
  assert.strictEqual(isProdutoTCG('ETB Treinador Avançado Pokémon TCG', 'Treinador Avançado'), true);
  assert.strictEqual(isProdutoTCG('Lata Pokémon Charizard com 4 boosters', 'Lata Charizard'), true);
  assert.strictEqual(isProdutoTCG('Deck Inicial Batalha Deluxe Meowscarada ex', 'Deck Batalha'), true);
});

test('Guardião de Nicho TCG - Aceita Yu-Gi-Oh!, Magic The Gathering e One Piece Card Game', () => {
  assert.strictEqual(isProdutoTCG('Deck Estrutural Yu-Gi-Oh! Mundo Obscuro Konami', 'Deck Yu-Gi-Oh'), true);
  assert.strictEqual(isProdutoTCG('Magic The Gathering Deck Commander Terras Selvagens MTG', 'Magic Commander'), true);
  assert.strictEqual(isProdutoTCG('One Piece Card Game Pillars of Strength Booster Box OP-03', 'One Piece Box'), true);
  assert.strictEqual(isProdutoTCG('Fichário 360 Cartas para TCG e Card Games com zíper', 'Fichário 360'), true);
  assert.strictEqual(isProdutoTCG('Sleeves Dragon Shield Matte Preto Protetor de Cartas', 'Sleeves'), true);
});

test('Guardião de Nicho TCG - Rejeita produtos de outros nichos e produtos genéricos', () => {
  assert.strictEqual(isProdutoTCG('Fritadeira Sem Óleo Air Fryer Mondial 4L Inox', 'Air Fryer'), false);
  assert.strictEqual(isProdutoTCG('Smartphone Samsung Galaxy S24 Ultra 256GB Titanium', 'Galaxy S24'), false);
  assert.strictEqual(isProdutoTCG('Camiseta Básica Masculina 100% Algodão Preta', 'Camiseta Básica'), false);
  assert.strictEqual(isProdutoTCG('Panela de Pressão Tramontina Solar Inox 6L', 'Panela Tramontina'), false);
  assert.strictEqual(isProdutoTCG('Perfume Feminino La Vie Est Belle 100ml Eau de Parfum', 'Perfume'), false);
});

test('Guardião de Nicho TCG - Aceita alertas e telas de cupom do Mercado Livre', () => {
  assert.strictEqual(isProdutoTCG('🎟️ NOVO CUPOM NO APP DO MERCADO LIVRE! Use MELIKIDS para R$ 15 OFF', 'Novo Cupom'), true);
  assert.strictEqual(isProdutoTCG('Cupom de desconto liberado no app do ML', 'Cupom de Desconto'), true);
  assert.strictEqual(isProdutoTCG('Aproveite o cupom 20OFF para economizar', 'Cupom 20OFF'), true);
});

