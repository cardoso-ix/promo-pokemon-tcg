import test from 'node:test';
import assert from 'node:assert/strict';
import {
  humanizarTexto,
  embelezarChamadaLocal,
  gerarCopiesLocaisFallback,
  redigirOfertaComIA
} from '../src/core/deepseek.js';

test('DeepSeek IA - humanizarTexto corrige abreviações e erros de digitação comuns', () => {
  const bruto = 'promo boa galera ta valendo mt a pena vcs tem q ver';
  const corrigido = humanizarTexto(bruto);

  assert.ok(corrigido.toLowerCase().includes('promoção'), 'Deve expandir promo para promoção');
  assert.ok(corrigido.includes('está'), 'Deve expandir ta para está');
  assert.ok(corrigido.includes('muito'), 'Deve expandir mt para muito');
  assert.ok(corrigido.includes('vocês'), 'Deve expandir vcs para vocês');
  assert.ok(corrigido.includes('que'), 'Deve expandir q para que');
});

test('DeepSeek IA - embelezarChamadaLocal deve formatar com emojis sem @ e sem disclaimers pesados', () => {
  const rascunho = 'chegou nova box de pokemon corram antes que acabe';
  const opcoes = embelezarChamadaLocal(rascunho);

  assert.ok(opcoes.length >= 2, 'Deve gerar múltiplas opções');
  for (const op of opcoes) {
    assert.ok(!op.includes('@pokemon_tcg_promo'), 'NÃO deve incluir @');
    assert.ok(!op.includes('Preço e estoque promocional sujeitos'), 'NÃO deve ter disclaimer longo');
    assert.ok(/(\p{Extended_Pictographic}|[\u{1F300}-\u{1F9FF}])/u.test(op), 'Deve conter emojis elegantes');
    assert.ok(op.toLowerCase().includes('box de pokemon') || op.toLowerCase().includes('corram'), 'Deve preservar o texto original');
  }
});

test('DeepSeek IA - redigirOfertaComIA deve validar rascunhos vazios de forma amigável', async () => {
  const res = await redigirOfertaComIA({ rascunho: '   ' });
  assert.equal(res.ok, false);
  assert.ok(res.erro && res.erro.includes('Digite'));
});

test('DeepSeek IA - redigirOfertaComIA deve polir mensagem com rapidez e manter o sentido original', async () => {
  const res = await redigirOfertaComIA({
    rascunho: 'PROMO BOA PESSOAL 5 UNIDADES NO ESTOQUE',
    link: 'https://mercadolivre.com/sec/exemplo'
  });

  assert.equal(res.ok, true);
  assert.ok(res.opcoes.length >= 2, 'Deve retornar ao menos 2 opções');
  assert.ok(!res.opcoes[0].includes('@pokemon_tcg_promo'), 'NÃO deve conter arroba');
  assert.ok(res.opcoes[0].includes('5 unidades') || res.opcoes[0].includes('5 Unidades'), 'Deve preservar 5 unidades');
  assert.ok(res.opcoes[0].includes('https://mercadolivre.com/sec/exemplo'), 'Deve conter o link intacto');
});
