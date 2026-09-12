import assert from 'node:assert';
import { test } from 'node:test';
import { formatarTituloPorSlug, gerarCopyPromocional } from '../src/core/anuncio.js';

test('formatarTituloPorSlug deve formatar slugs de forma limpa e com palavras-chave Pokémon', () => {
  const slug = 'pokemon-colecao-mega-zygarde-ex-box-lacrada-original-copag';
  const titulo = formatarTituloPorSlug(slug);

  assert.strictEqual(titulo.includes('Pokémon'), true);
  assert.strictEqual(titulo.includes('BOX'), true);
  assert.strictEqual(titulo.includes('COPAG'), true);
  assert.strictEqual(titulo.includes('EX'), true);
  assert.strictEqual(titulo.includes('Mega Zygarde'), true);
});

test('gerarCopyPromocional deve incluir cupom de desconto quando informado', () => {
  const copy = gerarCopyPromocional({
    titulo: 'Pokémon Booster Box 36 Pacotes',
    linkAfiliado: 'https://mercadolivre.com/sec/2rM6RPm',
    cupom: 'POKEMON10',
    precoDe: '299,00',
    precoPor: '249,00'
  });

  assert.strictEqual(copy.includes('🎟️ Cupom de Desconto: *POKEMON10*'), true);
  assert.strictEqual(copy.includes('~De: R$ 299,00~'), true);
  assert.strictEqual(copy.includes('*Por apenas: R$ 249,00*'), true);
  assert.strictEqual(copy.includes('https://mercadolivre.com/sec/2rM6RPm'), true);
});

test('gerarCopyPromocional deve omitir a linha de cupom quando vazio', () => {
  const copy = gerarCopyPromocional({
    titulo: 'Fichário Pokémon 360 Cartas Ultra Pro',
    linkAfiliado: 'https://meli.la/abc1234',
    cupom: ''
  });

  assert.strictEqual(copy.includes('Cupom de Desconto'), false);
  assert.strictEqual(copy.includes('Fichário Pokémon 360 Cartas Ultra Pro'), true);
  assert.strictEqual(copy.includes('https://meli.la/abc1234'), true);
});
