import assert from 'node:assert';
import { test } from 'node:test';
import { isProdutoTCG, isProdutoExclusivoPokemon } from '../src/core/anuncio.js';

test('Guardião Estrito Pokémon - Aceita produtos e coleções oficiais de Pokémon TCG', () => {
  assert.strictEqual(isProdutoExclusivoPokemon('Booster Box Pokémon Escarlate e Violeta Copag', 'Box Pokémon'), true);
  assert.strictEqual(isProdutoExclusivoPokemon('ETB Treinador Avançado Pokémon TCG', 'Treinador Avançado'), true);
  assert.strictEqual(isProdutoExclusivoPokemon('Lata Pokémon Charizard com 4 boosters', 'Lata Charizard'), true);
  assert.strictEqual(isProdutoExclusivoPokemon('Deck Inicial Batalha Deluxe Meowscarada ex', 'Deck Batalha'), true);
  // Produtos com Pokémons famosos ou coleções especiais sem a palavra Pokémon explícita
  assert.strictEqual(isProdutoExclusivoPokemon('*BOX 30 ANOS - GRENINJA _OU_ SYLVEON (SORTIDO!)*', 'Box 30 Anos'), true);
  assert.strictEqual(isProdutoExclusivoPokemon('Coleção Especial Sylveon ex 6 boosters Copag', 'Coleção Sylveon'), true);
  assert.strictEqual(isProdutoExclusivoPokemon('Lata Rayquaza Destinos Brilhantes 4 boosters', 'Lata Rayquaza'), true);
  assert.strictEqual(isProdutoExclusivoPokemon('Blister Triplo Umbreon Evoluções Prismáticas', 'Blister Umbreon'), true);
  assert.strictEqual(isProdutoExclusivoPokemon('Box Celebrações 25 Anos Lacrada', 'Box Celebrações'), true);
  assert.strictEqual(isProdutoExclusivoPokemon('Combo De Booster Heróis Excelsos 108 Cartas', 'Heróis Excelsos'), true);
  assert.strictEqual(isProdutoExclusivoPokemon('Elite Trainer Box Destinos de Paldea', 'ETB Paldea'), true);
  assert.strictEqual(isProdutoExclusivoPokemon('Booster Coleção 151 Copag', '151 Copag'), true);
});

test('Guardião Estrito Pokémon - REJEITA Yu-Gi-Oh!, Magic The Gathering, One Piece, Lorcana e outros TCGs', () => {
  assert.strictEqual(isProdutoExclusivoPokemon('Deck Estrutural Yu-Gi-Oh! Mundo Obscuro Konami', 'Deck Yu-Gi-Oh'), false);
  assert.strictEqual(isProdutoExclusivoPokemon('Magic The Gathering Deck Commander Terras Selvagens MTG', 'Magic Commander'), false);
  assert.strictEqual(isProdutoExclusivoPokemon('One Piece Card Game Pillars of Strength Booster Box OP-03', 'One Piece Box'), false);
  assert.strictEqual(isProdutoExclusivoPokemon('Disney Lorcana Trove Box The First Chapter', 'Lorcana Box'), false);
  assert.strictEqual(isProdutoExclusivoPokemon('Digimon Card Game Booster Box Special Booster Ver.2.0', 'Digimon Box'), false);
  assert.strictEqual(isProdutoExclusivoPokemon('Star Wars Unlimited Spark of Rebellion Booster Box', 'Star Wars Box'), false);
});

test('Guardião Estrito Pokémon - REJEITA produtos de outros nichos e produtos genéricos', () => {
  assert.strictEqual(isProdutoExclusivoPokemon('Fritadeira Sem Óleo Air Fryer Mondial 4L Inox', 'Air Fryer'), false);
  assert.strictEqual(isProdutoExclusivoPokemon('Smartphone Samsung Galaxy S24 Ultra 256GB Titanium', 'Galaxy S24'), false);
  assert.strictEqual(isProdutoExclusivoPokemon('Camiseta Básica Masculina 100% Algodão Preta', 'Camiseta Básica'), false);
  assert.strictEqual(isProdutoExclusivoPokemon('Panela de Pressão Tramontina Solar Inox 6L', 'Panela Tramontina'), false);
  assert.strictEqual(isProdutoExclusivoPokemon('Perfume Feminino La Vie Est Belle 100ml Eau de Parfum', 'Perfume'), false);
});

test('Guardião Estrito Pokémon - REJEITA cupons genéricos e cupons de outros nichos', () => {
  // Cupons gerais do app que NÃO mencionam Pokémon DEVEM ser rejeitados no modo estrito
  assert.strictEqual(isProdutoExclusivoPokemon('🎟️ NOVO CUPOM NO APP DO MERCADO LIVRE! Use MELIKIDS para R$ 15 OFF', 'Novo Cupom'), false);
  assert.strictEqual(isProdutoExclusivoPokemon('Cupom de desconto liberado no app do ML', 'Cupom de Desconto'), false);
  assert.strictEqual(isProdutoExclusivoPokemon('Aproveite o cupom 20OFF para economizar em eletrodomésticos', 'Cupom 20OFF'), false);
});

test('Guardião Estrito Pokémon - ACEITA cupons quando associados a Pokémon', () => {
  assert.strictEqual(isProdutoExclusivoPokemon('🎟️ NOVO CUPOM para cartas Pokémon no app do ML! Cupom POKE10', 'Cupom Pokémon'), true);
  assert.strictEqual(isProdutoExclusivoPokemon('Cupom 15OFF válido na compra de Box Pokémon Charizard', 'Box Charizard com Cupom'), true);
  assert.strictEqual(isProdutoExclusivoPokemon('Cupom de R$ 20 OFF em toda a linha Copag Pokémon', 'Cupom Copag'), true);
});

test('Guardião de Nicho TCG Amplo (Retrocompatibilidade) - Mantém comportamento abrangente', () => {
  assert.strictEqual(isProdutoTCG('Deck Estrutural Yu-Gi-Oh! Mundo Obscuro Konami', 'Deck Yu-Gi-Oh'), true);
  assert.strictEqual(isProdutoTCG('Magic The Gathering Deck Commander Terras Selvagens MTG', 'Magic Commander'), true);
  assert.strictEqual(isProdutoTCG('One Piece Card Game Pillars of Strength Booster Box OP-03', 'One Piece Box'), true);
  assert.strictEqual(isProdutoTCG('Booster Box Pokémon Escarlate e Violeta Copag', 'Box Pokémon'), true);
  assert.strictEqual(isProdutoTCG('🎟️ NOVO CUPOM NO APP DO MERCADO LIVRE! Use MELIKIDS para R$ 15 OFF', 'Novo Cupom'), true);
  assert.strictEqual(isProdutoTCG('Fritadeira Sem Óleo Air Fryer Mondial 4L Inox', 'Air Fryer'), false);
});

test('Regra de Grupo de Teste - Origem identificada como Teste tem liberação irrestrita para replicação', () => {
  const isGrupoOrigemTeste = (origemNome: string, remoteJid: string, rotas: Array<{ nome: string; origens: string[] }>) => {
    return Boolean(
      (origemNome && /\bteste\b|\btest\b/i.test(origemNome)) ||
      rotas.some((r) => /\bteste\b|\btest\b/i.test(r.nome)) ||
      remoteJid === '120363429483901666@g.us'
    );
  };

  // Grupo com nome 'TESTE'
  assert.strictEqual(isGrupoOrigemTeste('TESTE', '120363429483901666@g.us', [{ nome: 'Oficial', origens: ['120363429483901666@g.us'] }]), true);

  // Grupo cuja rota é de 'Teste'
  assert.strictEqual(isGrupoOrigemTeste('Grupo Qualquer', '120000000@g.us', [{ nome: 'Rota Teste', origens: ['120000000@g.us'] }]), true);

  // Grupo de terceiro/concorrente que NÃO é teste (deve cair na validação normal de nicho)
  assert.strictEqual(isGrupoOrigemTeste('PlayHard Ofertas TCG #63', '120363413903821796@g.us', [{ nome: 'Oficial', origens: ['120363413903821796@g.us'] }]), false);
});
