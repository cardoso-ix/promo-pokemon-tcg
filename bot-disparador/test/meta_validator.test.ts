import assert from 'node:assert';
import { test } from 'node:test';
import {
  validateMetaTemplate,
  calculateSpintaxCombinations
} from '../src/core/meta-validator.js';

test('calculateSpintaxCombinations calcula corretamente as combinações', () => {
  // Sem spintax
  assert.strictEqual(calculateSpintaxCombinations('Olá amigo tudo bem?'), 1);

  // Spintax simples: {A|B|C} -> 3
  assert.strictEqual(calculateSpintaxCombinations('{Olá|Oi|Fala} amigo!'), 3);

  // Múltiplos spintax: {A|B} e {1|2|3} -> 2 * 3 = 6
  assert.strictEqual(calculateSpintaxCombinations('{Olá|Oi} {nome}! {Tudo bem|Como vai|Beleza}?'), 6);

  // Com campos vazios: {opção|} -> 2
  assert.strictEqual(calculateSpintaxCombinations('{Olá|Oi|} amigo'), 3);
});

test('validateMetaTemplate penaliza gatilhos pesados de spam da Meta', () => {
  const spamTemplate = 'COMPRE JÁ COM DESCONTO IMPERDÍVEL! CLIQUE AQUI E GANHE DINHEIRO!';
  const result = validateMetaTemplate(spamTemplate);

  assert.strictEqual(result.nivelRisco, 'alto_risco');
  assert(result.score < 60, `Score esperado < 60, obtido: ${result.score}`);
  assert(result.infracoes.some((i) => i.id === 'spam_words'), 'Deve detectar palavras de spam');
  assert(result.infracoes.some((i) => i.id === 'all_caps'), 'Deve detectar excesso de caixa alta');
});

test('validateMetaTemplate penaliza links em primeiro contato / mensagem fria', () => {
  const linkTemplate = 'Olá colecionador! Veja nosso catálogo em https://loja-pokemon.com/promocoes';
  const result = validateMetaTemplate(linkTemplate, { isColdContact: true });

  assert(result.infracoes.some((i) => i.id === 'cold_link'), 'Deve alertar sobre link em mensagem fria');
  assert(result.score <= 75, `Score com link frio deve ser penalizado, obtido: ${result.score}`);
});

test('validateMetaTemplate exige personalização ({nome} ou {saudacao})', () => {
  const semNome = 'Oi! Temos novidades de Pokémon TCG para você!';
  const resultSemNome = validateMetaTemplate(semNome);
  assert(resultSemNome.infracoes.some((i) => i.id === 'sem_personalizacao'), 'Deve exigir tag de personalização');

  const comNome = '{Olá|Oi} {nome}! {Tudo bem|Como vai}?';
  const resultComNome = validateMetaTemplate(comNome);
  assert(!resultComNome.infracoes.some((i) => i.id === 'sem_personalizacao'), 'Não deve penalizar quando tem {nome}');
});

test('validateMetaTemplate aprova template seguro, humanizado e com alto Spintax', () => {
  const safeTemplate =
    '{Fala|E aí|Oi} {nome}, {tudo bom|tudo bem|beleza}? {Notei que você curte|Vi que você também acompanha|Como você também curte} Pokémon TCG, {posso te fazer um convite rápido pro nosso grupo de ofertas|queria te mostrar a comunidade VIP de colecionadores}?';
  const result = validateMetaTemplate(safeTemplate, { isColdContact: true });

  assert.strictEqual(result.nivelRisco, 'seguro');
  assert(result.score >= 85, `Score esperado >= 85, obtido: ${result.score}`);
  assert(result.combinacoesSpintax >= 18, `Esperado >= 18 combinações, obtido: ${result.combinacoesSpintax}`);
  assert(result.infracoes.length === 0, 'Template seguro não deve ter infrações graves');
});

test('validateMetaTemplate penaliza excesso de emojis e falta de tom conversacional', () => {
  const emojiSpam = 'Olá {nome} 🔥🔥🔥🔥🔥🚀🚀🚀🚀💰💰💰 Oferta top de cartas';
  const result = validateMetaTemplate(emojiSpam);

  assert(result.infracoes.some((i) => i.id === 'excess_emojis'), 'Deve detectar excesso de emojis');
  assert(result.infracoes.some((i) => i.id === 'sem_pergunta'), 'Deve notar ausência de pergunta no final');
});
