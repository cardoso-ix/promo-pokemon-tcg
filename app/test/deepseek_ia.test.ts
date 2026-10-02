import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gerarCopiesLocaisFallback,
  redigirOfertaComIA
} from '../src/core/deepseek.js';

test('DeepSeek IA - gerarCopiesLocaisFallback deve estruturar dois modelos profissionais de alta conversão', () => {
  const rascunho = `Promoção muito boa galera, box de 36 pacotes por 180 reais, corram! De 230 por 180.
Cupom: BRINCAR`;
  const link = 'https://mercadolivre.com/sec/2rM6RPm';

  const resultado = gerarCopiesLocaisFallback(rascunho, link);

  assert.ok(resultado.modeloUrgencia, 'Modelo de urgência deve ser gerado');
  assert.ok(resultado.modeloComunidade, 'Modelo de comunidade deve ser gerado');

  // Assinatura de marca obrigatória
  assert.ok(resultado.modeloUrgencia.startsWith('@pokemon_tcg_promo'), 'Urgência deve iniciar com @pokemon_tcg_promo');
  assert.ok(resultado.modeloComunidade.startsWith('@pokemon_tcg_promo'), 'Comunidade deve iniciar com @pokemon_tcg_promo');

  // Presença do link
  assert.ok(resultado.modeloUrgencia.includes(link), 'Deve conter o link de afiliado');
  assert.ok(resultado.modeloComunidade.includes(link), 'Deve conter o link de afiliado');

  // Presença de preços e cupom
  assert.ok(resultado.modeloUrgencia.includes('180'), 'Deve conter o preço Por');
  assert.ok(resultado.modeloUrgencia.includes('BRINCAR'), 'Deve conter o código do cupom');

  // Rodapé padrão
  assert.ok(
    resultado.modeloUrgencia.includes('Preço e estoque promocional sujeitos a alteração a qualquer momento'),
    'Deve conter rodapé padrão'
  );
});

test('DeepSeek IA - redigirOfertaComIA deve ativar Fallback Local instantâneo com resiliência total', async () => {
  const t0 = Date.now();
  const res = await redigirOfertaComIA({
    rascunho: 'Combo 18 Boosters Pokémon Copag por apenas R$ 89',
    link: 'https://meli.la/exemplo-teste'
  });
  const decorrido = Date.now() - t0;

  assert.equal(res.ok, true);
  assert.ok(['deepseek', 'fallback_local'].includes(res.fonte));
  assert.ok(res.modeloUrgencia.length > 50);
  assert.ok(res.modeloComunidade.length > 50);
  assert.ok(res.linkAfiliado.includes('exemplo-teste'));
  assert.ok(decorrido < 1000, `Resposta deve ser rápida (< 1s), levou ${decorrido}ms`);
});

test('DeepSeek IA - redigirOfertaComIA deve validar rascunhos vazios de forma amigável', async () => {
  const res = await redigirOfertaComIA({ rascunho: '   ' });
  assert.equal(res.ok, false);
  assert.ok(res.erro && res.erro.includes('Digite'));
});

test('DeepSeek IA - Modo Chamada Rápida deve embelezar texto sem arrobas, sem links e com emojis', async () => {
  const res = await redigirOfertaComIA({
    rascunho: 'PROMO BOA PESSOAL 5 UNIDADES',
    modo: 'chamada'
  });

  assert.equal(res.ok, true);
  assert.equal(res.modo, 'chamada');
  assert.ok(res.opcoes.length >= 2, 'Deve gerar pelo menos 2 opções de chamada rápida');

  for (const op of res.opcoes) {
    // Não pode conter arrobas nem links nem avisos longos de rodapé
    assert.ok(!op.includes('@pokemon_tcg_promo'), 'Chamada rápida NUNCA deve ter @');
    assert.ok(!op.includes('http'), 'Chamada rápida NUNCA deve ter links');
    assert.ok(!op.includes('Preço e estoque promocional sujeitos'), 'Chamada rápida NUNCA deve ter disclaimer pesado');
    // Deve conter emojis
    assert.ok(/[\u{1F300}-\u{1F9FF}]/u.test(op), 'Chamada rápida deve conter emojis');
    // Deve conter a essência do que foi falado (ex: 5 unidades)
    assert.ok(op.includes('5 unidades'), 'Deve preservar o número de unidades');
  }
});
