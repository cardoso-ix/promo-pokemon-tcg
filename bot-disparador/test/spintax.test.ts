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

test('Templates Amigáveis de Aquecimento Seguro (De Fã para Fãs) devem ter alta variabilidade e sem erros de Spintax', () => {
  const templatesAquecimento = [
    `{Olá|Oi|Fala|E aí} {nome}! {{saudacao}|Tudo bem|Como você tá}? Aqui é o Eduardo! Vi seu contato no grupo {grupo}. Como também sou colecionador e fãzaço de Pokémon TCG, montei um grupo bem legal {feito de verdade de um fã para outros fãs|criado de coração de fã pra fã}. {Posso te fazer um convite para o meu grupo?|Queria saber se posso te fazer um convite para entrar no meu grupo?}`,
    `{{saudacao}|Oi|Opa|Fala} {nome}, {tudo certo|tudo bem|tudo joia}? Aqui é o Eduardo do grupo {grupo}. Criei uma comunidade {feita de fã para fãs|criada de fã pra fã de coração}. {Posso te fazer um convite para meu grupo?|Será que posso te fazer um convite pro meu grupo?}`,
    `{Fala|Oi|Olá|Opa} {nome}! Aqui é o Eduardo! Vi você no grupo {grupo}. Criei um grupo {totalmente feito de um fã para fãs|feito de fã pra fã de colecionador}. {Posso te fazer um convite para o meu grupo?|Queria saber se posso te fazer um convite pro meu grupo?}`,
    `{{saudacao}|{Olá|Oi|Fala|E aí}} {nome}! {{Tudo bem|Tudo certo|Como você tá}?|} Aqui é o Eduardo do {grupo}! Criei um grupo {feito de um fã para fãs|criado de fã pra fã de verdade}. {Posso te fazer um convite para meu grupo?|Queria te perguntar se posso te fazer um convite para entrar no meu grupo?}`,
    `{Opa|Oi|Olá} {nome}! Aqui é o Eduardo! Vi você no grupo {grupo}. Como colecionador de Pokémon TCG, criei um espaço {100% feito de um fã para fãs|feito de coração de fã pra fã}. {Posso te fazer um convite para o meu grupo?|Queria saber se posso te fazer um convite pra participar com a gente?}`
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
      // Deve conter o nome e grupo
      assert.strictEqual(rendered.includes('Carlos'), true);
      assert.strictEqual(rendered.includes('Colecionadores Pokémon SP'), true);
      // Deve conter "Eduardo"
      assert.strictEqual(rendered.includes('Eduardo'), true);
      // Deve conter "fã" e convite
      assert.strictEqual(rendered.toLowerCase().includes('fã'), true);
      assert.strictEqual(rendered.toLowerCase().includes('convite'), true);
      outputs.add(rendered);
    }
    // Deve haver variação significativa
    assert.ok(outputs.size >= 4, `Template deve gerar variações distintas (gerou ${outputs.size})`);
  }
});

