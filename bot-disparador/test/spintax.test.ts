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

test('Templates Amigáveis de Aquecimento Seguro devem ter alta variabilidade e sem erros de Spintax', () => {
  const templatesAquecimento = [
    `{Olá|Oi|Fala|E aí} {nome}! {{saudacao}|Tudo bem com você|Como estão as coisas}? Vi seu contato no grupo {grupo}.`,
    `{{saudacao}|Oi|Opa|Fala} {nome}, {tudo certo|tudo bem|beleza}? Vi que você também participa no grupo {grupo}.`,
    `{Fala|Oi|Olá|Opa} {nome}! {Tudo bem|Como você tá|Beleza}? Vi seu contato no grupo {grupo}. Quer que eu te envie o convite?`,
    `{{saudacao}|{Olá|Oi|Fala|E aí}} {nome}! {{Tudo bem|Tudo certo|Como você tá}?|} Vi seu contato no grupo {grupo}.`,
    `{Opa|Oi|Olá} {nome}! {Tudo joia|Tudo tranquilo}? Vi seu perfil no grupo {grupo}.`
  ];

  const contato = {
    nome: 'Carlos Eduardo',
    numero: '5511988887777',
    grupo_nome: 'Colecionadores Pokémon SP'
  };

  for (const t of templatesAquecimento) {
    const outputs = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const rendered = renderMessageTemplate(t, contato);
      // Não deve sobrar chaves nem pipes
      assert.strictEqual(rendered.includes('{'), false);
      assert.strictEqual(rendered.includes('}'), false);
      assert.strictEqual(rendered.includes('|'), false);
      // Deve ter substituído as tags
      assert.strictEqual(rendered.includes('Carlos'), true);
      assert.strictEqual(rendered.includes('Colecionadores Pokémon SP'), true);
      outputs.add(rendered);
    }
    // Deve haver variação significativa
    assert.ok(outputs.size >= 4, `Template deve gerar variações distintas (gerou ${outputs.size})`);
  }
});

