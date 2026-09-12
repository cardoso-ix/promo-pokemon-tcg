import assert from 'node:assert';
import { test } from 'node:test';
import { parseSpintax, renderMessageTemplate, getSaudacaoHorario } from '../src/core/spintax.js';

test('parseSpintax deve sortear opcoes de uma lista {A|B|C}', () => {
  const template = '{Olá|Oi|E aí}, amigo!';
  const results = new Set<string>();

  for (let i = 0; i < 50; i++) {
    const rendered = parseSpintax(template);
    assert.strictEqual(rendered.includes('{'), false);
    assert.strictEqual(rendered.includes('}'), false);
    assert.strictEqual(rendered.includes('|'), false);
    results.add(rendered);
  }

  // Com 50 iterações, deve ter variado entre as 3 opções
  assert.strictEqual(results.size > 1, true);
});

test('renderMessageTemplate deve substituir tags dinâmicas {nome}, {saudacao} e {grupo}', () => {
  const template = '{saudacao}, {nome}! Bem-vindo ao {grupo}. Seu número é {numero}.';
  const contato = {
    nome: 'Eduardo Cardoso',
    numero: '5511999999999',
    grupo_nome: 'Pokémon TCG Brasil'
  };

  const rendered = renderMessageTemplate(template, contato);
  assert.strictEqual(rendered.includes('Eduardo'), true);
  assert.strictEqual(rendered.includes('Pokémon TCG Brasil'), true);
  assert.strictEqual(rendered.includes('5511999999999'), true);
  assert.strictEqual(rendered.includes('{nome}'), false);
  assert.strictEqual(rendered.includes('{saudacao}'), false);
});
