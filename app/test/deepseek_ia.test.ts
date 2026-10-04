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

test('DeepSeek IA - embelezarChamadaLocal deve formatar 5 opções com emojis e SEM frases de efeito', () => {
  const rascunho = 'CORRE PARA APROVEITAR';
  const opcoes = embelezarChamadaLocal(rascunho);

  assert.equal(opcoes.length, 5, 'Deve gerar exatamente 5 opções padronizadas');
  
  const frasesEfeitoProibidas = [
    'aproveitem enquanto',
    'atenção:',
    'atenção, pessoal',
    'vale muito a pena',
    'oportunidade top',
    'corram pra garantir'
  ];

  for (const op of opcoes) {
    assert.ok(!op.includes('@pokemon_tcg_promo'), 'NÃO deve incluir @');
    assert.ok(!op.includes('Preço e estoque promocional sujeitos'), 'NÃO deve ter disclaimer longo');
    assert.ok(/(\p{Extended_Pictographic}|[\u{1F300}-\u{1F9FF}])/u.test(op), 'Deve conter emojis');
    assert.ok(op.toLowerCase().includes('corre para aproveitar'), 'Deve preservar o texto original adaptado');
    
    for (const proibida of frasesEfeitoProibidas) {
      assert.ok(!op.toLowerCase().includes(proibida), `NÃO deve conter frase de efeito: "${proibida}"`);
    }
  }
});

test('DeepSeek IA - redigirOfertaComIA deve validar rascunhos vazios de forma amigável', async () => {
  const res = await redigirOfertaComIA({ rascunho: '   ' });
  assert.equal(res.ok, false);
  assert.ok(res.erro && res.erro.includes('Digite'));
});

test('DeepSeek IA - redigirOfertaComIA deve polir mensagem com rapidez e manter o sentido original em 5 opções', async () => {
  const res = await redigirOfertaComIA({
    rascunho: 'PROMO BOA PESSOAL 5 UNIDADES NO ESTOQUE',
    link: 'https://mercadolivre.com/sec/exemplo'
  });

  assert.equal(res.ok, true);
  assert.equal(res.opcoes.length, 5, 'Deve retornar 5 opções padronizadas');
  assert.ok(!res.opcoes[0].includes('@pokemon_tcg_promo'), 'NÃO deve conter arroba');
  assert.ok(res.opcoes[0].includes('5 unidades') || res.opcoes[0].includes('5 Unidades'), 'Deve preservar 5 unidades');
  assert.ok(res.opcoes[0].includes('https://mercadolivre.com/sec/exemplo'), 'Deve conter o link intacto');
});

