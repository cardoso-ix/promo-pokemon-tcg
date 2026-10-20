import assert from 'node:assert';
import { test } from 'node:test';
import { isProdutoTCG, isOutroTCGBloqueado } from '../src/core/anuncio.js';

test('isOutroTCGBloqueado - Identifica com precisão ofertas de outros TCGs para bloqueio', () => {
  assert.strictEqual(isOutroTCGBloqueado('Deck Estrutural Yu-Gi-Oh! Mundo Obscuro Konami', 'Deck Yu-Gi-Oh'), true);
  assert.strictEqual(isOutroTCGBloqueado('Magic The Gathering Deck Commander Terras Selvagens MTG', 'Magic Commander'), true);
  assert.strictEqual(isOutroTCGBloqueado('One Piece Card Game Pillars of Strength Booster Box OP-03', 'One Piece Box'), true);
  assert.strictEqual(isOutroTCGBloqueado('Disney Lorcana Trove Box The First Chapter', 'Lorcana Box'), true);
  assert.strictEqual(isOutroTCGBloqueado('Digimon Card Game Booster Box Special Booster Ver.2.0', 'Digimon Box'), true);
  assert.strictEqual(isOutroTCGBloqueado('Star Wars Unlimited Spark of Rebellion Booster Box', 'Star Wars Box'), true);

  // NÃO deve bloquear Pokémon, coleções ou cupons
  assert.strictEqual(isOutroTCGBloqueado('Booster Box Pokémon Escarlate e Violeta Copag', 'Box Pokémon'), false);
  assert.strictEqual(isOutroTCGBloqueado('50 Sleeve Vermelho Protetor de Cartas', 'Sleeve Vermelho'), false);
  assert.strictEqual(isOutroTCGBloqueado('🚨 CUPOM DE 40% OFF NO MERCADO LIVRE🔥 40SITETODO', 'Novo Cupom'), false);
  assert.strictEqual(isOutroTCGBloqueado('Blister Duplo 30 Anos com Moeda', 'Blister 30 Anos'), false);
});

test('isProdutoTCG - Bloqueia outros TCGs e aceita Pokémon, Cupons e Acessórios exatamente como antes', () => {
  // Outros TCGs -> BLOQUEADOS
  assert.strictEqual(isProdutoTCG('Deck Estrutural Yu-Gi-Oh! Mundo Obscuro Konami', 'Deck Yu-Gi-Oh'), false);
  assert.strictEqual(isProdutoTCG('Magic The Gathering Deck Commander Terras Selvagens MTG', 'Magic Commander'), false);
  assert.strictEqual(isProdutoTCG('One Piece Card Game Pillars of Strength Booster Box OP-03', 'One Piece Box'), false);
  assert.strictEqual(isProdutoTCG('Disney Lorcana Trove Box The First Chapter', 'Lorcana Box'), false);

  // Produtos de Pokémon e Cartas -> ACEITOS COMO ANTES
  assert.strictEqual(isProdutoTCG('Booster Box Pokémon Escarlate e Violeta Copag', 'Box Pokémon'), true);
  assert.strictEqual(isProdutoTCG('ETB Treinador Avançado Pokémon TCG', 'Treinador Avançado'), true);
  assert.strictEqual(isProdutoTCG('50 Sleeve Vermelho Protetor de Cartas', 'Sleeve Vermelho'), true);
  assert.strictEqual(isProdutoTCG('Fichário 360 Cartas para TCG e Card Games com zíper', 'Fichário 360'), true);
  assert.strictEqual(isProdutoTCG('Blister Triplo Umbreon Evoluções Prismáticas', 'Blister Umbreon'), true);

  // Cupons do Mercado Livre -> ACEITOS COMO ANTES
  assert.strictEqual(isProdutoTCG('🚨 CUPOM DE 40% OFF NO MERCADO LIVRE🔥 40SITETODO', 'Cupom 40%'), true);
  assert.strictEqual(isProdutoTCG('🎟️ NOVO CUPOM NO APP DO MERCADO LIVRE! Use MELIKIDS para R$ 15 OFF', 'Novo Cupom'), true);
  assert.strictEqual(isProdutoTCG('Cupom de desconto liberado no app do ML', 'Cupom de Desconto'), true);

  // Outros nichos não-TCG -> REJEITADOS
  assert.strictEqual(isProdutoTCG('Fritadeira Sem Óleo Air Fryer Mondial 4L Inox', 'Air Fryer'), false);
  assert.strictEqual(isProdutoTCG('Smartphone Samsung Galaxy S24 Ultra 256GB Titanium', 'Galaxy S24'), false);
  assert.strictEqual(isProdutoTCG('Panela de Pressão Tramontina Solar Inox 6L', 'Panela Tramontina'), false);
});

test('Regra de Grupo de Teste - Origem identificada como Teste tem liberação irrestrita para replicação', () => {
  const isGrupoOrigemTeste = (origemNome: string, remoteJid: string, rotas: Array<{ nome: string; origens: string[] }>) => {
    return Boolean(
      (origemNome && /\bteste\b|\btest\b/i.test(origemNome)) ||
      rotas.some((r) => /\bteste\b|\btest\b/i.test(r.nome)) ||
      remoteJid === '120363429483901666@g.us'
    );
  };

  assert.strictEqual(isGrupoOrigemTeste('TESTE', '120363429483901666@g.us', [{ nome: 'Oficial', origens: ['120363429483901666@g.us'] }]), true);
  assert.strictEqual(isGrupoOrigemTeste('Grupo Qualquer', '120000000@g.us', [{ nome: 'Rota Teste', origens: ['120000000@g.us'] }]), true);
  assert.strictEqual(isGrupoOrigemTeste('PlayHard Ofertas TCG #63', '120363413903821796@g.us', [{ nome: 'Oficial', origens: ['120363413903821796@g.us'] }]), false);
});
