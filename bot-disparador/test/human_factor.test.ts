import assert from 'node:assert';
import { test } from 'node:test';
import { calculateDynamicDelay, calculateBlockPauseMinutes } from '../src/core/engine.js';
import { calculateTypingDelay } from '../src/whatsapp/client.js';
import { getWarmupStatus, resetWarmupStartDate, setConfig, getConfig } from '../src/db/database.js';

test('Fator Humano - Regra 1: Delay Variável e Dinâmico', () => {
  const samples: number[] = [];
  for (let i = 0; i < 50; i++) {
    const delay = calculateDynamicDelay(15, 45);
    samples.push(delay);
    assert.ok(delay >= 15000, `Delay (${delay}ms) deve ser >= 15000ms`);
    assert.ok(delay <= 46000, `Delay (${delay}ms) deve ser <= 46000ms (com jitter)`);
  }

  // Verifica que os delays são variáveis e aleatórios (nunca fixos)
  const uniqueDelays = new Set(samples);
  assert.ok(uniqueDelays.size >= 10, 'Deve haver diversidade de delays, nunca intervalo fixo');

  // Teste de segurança contra delay fixo (quando usuário configura min == max)
  const fixedConfigSamples: number[] = [];
  for (let i = 0; i < 30; i++) {
    fixedConfigSamples.push(calculateDynamicDelay(30, 30));
  }
  const uniqueFixed = new Set(fixedConfigSamples);
  assert.ok(uniqueFixed.size > 1, 'Mesmo configurado com min=max, o sistema deve injetar variação anti-ban');
});

test('Fator Humano - Regra 2: Simulação Realista de Digitação e Presença', () => {
  // Texto curto: deve respeitar o tempo mínimo (ex: 3s)
  const delayCurto = calculateTypingDelay(10, 3, 10);
  assert.ok(delayCurto >= 3000, `Delay de texto curto (${delayCurto}ms) deve respeitar min 3000ms`);
  assert.ok(delayCurto <= 4000, `Delay de texto curto (${delayCurto}ms) deve ser próximo do início`);

  // Texto longo: deve escalar proporcionalmente e respeitar o teto máximo (ex: 10s)
  const delayLongo = calculateTypingDelay(400, 3, 10);
  assert.ok(delayLongo >= 8000, `Delay de texto longo (${delayLongo}ms) deve ser superior a 8000ms`);
  assert.ok(delayLongo <= 10000, `Delay de texto longo (${delayLongo}ms) não deve estourar o teto de 10000ms`);

  // Texto intermediário
  const delayMedio = calculateTypingDelay(100, 3, 10);
  assert.ok(delayMedio >= 3000 && delayMedio <= 10000);
});

test('Fator Humano - Regra 3: Volume Gradual e Aquecimento do Chip (Warm Up)', () => {
  // Salvar estado anterior
  const backupAtivo = getConfig('aquecimento_ativo');
  const backupInicio = getConfig('aquecimento_inicio_diario');
  const backupInc = getConfig('aquecimento_incremento_diario');
  const backupTeto = getConfig('aquecimento_limite_maximo');
  const backupData = getConfig('aquecimento_data_inicio');

  try {
    setConfig('aquecimento_ativo', 'true');
    setConfig('aquecimento_inicio_diario', '20');
    setConfig('aquecimento_incremento_diario', '5');
    setConfig('aquecimento_limite_maximo', '100');

    // 1. Dia 1 (início hoje)
    resetWarmupStartDate();
    const dia1 = getWarmupStatus();
    assert.strictEqual(dia1.ativo, true);
    assert.strictEqual(dia1.diaAtual, 1);
    assert.strictEqual(dia1.limiteHoje, 20);
    assert.strictEqual(dia1.concluido, false);

    // 2. Simular Dia 5 (início há 4 dias no calendário local)
    const d4 = new Date();
    d4.setDate(d4.getDate() - 4);
    const quatroDiasAtras = `${d4.getFullYear()}-${String(d4.getMonth() + 1).padStart(2, '0')}-${String(d4.getDate()).padStart(2, '0')}`;
    setConfig('aquecimento_data_inicio', quatroDiasAtras);
    const dia5 = getWarmupStatus();
    assert.strictEqual(dia5.diaAtual, 5);
    // 20 + 4 * 5 = 40
    assert.strictEqual(dia5.limiteHoje, 40);

    // 3. Simular conclusão do aquecimento (início há 25 dias)
    const d25 = new Date();
    d25.setDate(d25.getDate() - 25);
    const vinteCincoDiasAtras = `${d25.getFullYear()}-${String(d25.getMonth() + 1).padStart(2, '0')}-${String(d25.getDate()).padStart(2, '0')}`;
    setConfig('aquecimento_data_inicio', vinteCincoDiasAtras);
    const dia26 = getWarmupStatus();
    assert.strictEqual(dia26.diaAtual, 26);
    // 20 + 25 * 5 = 145 -> Teto 100
    assert.strictEqual(dia26.limiteHoje, 100);
    assert.strictEqual(dia26.concluido, true);

    // 4. Teste com aquecimento desativado (fallback para limite fixo)
    setConfig('aquecimento_ativo', 'false');
    setConfig('disparo_limite_diario', '150');
    const desativado = getWarmupStatus();
    assert.strictEqual(desativado.ativo, false);
    assert.strictEqual(desativado.limiteHoje, 150);
  } finally {
    // Restaurar
    if (backupAtivo) setConfig('aquecimento_ativo', backupAtivo);
    if (backupInicio) setConfig('aquecimento_inicio_diario', backupInicio);
    if (backupInc) setConfig('aquecimento_incremento_diario', backupInc);
    if (backupTeto) setConfig('aquecimento_limite_maximo', backupTeto);
    if (backupData) setConfig('aquecimento_data_inicio', backupData);
  }
});

test('Fator Humano - Regra 4: Pausas Longas em Blocos de Envio', () => {
  const pausas: number[] = [];
  for (let i = 0; i < 40; i++) {
    const minutos = calculateBlockPauseMinutes(30, 60);
    pausas.push(minutos);
    assert.ok(minutos >= 30, `Pausa (${minutos} min) deve ser >= 30 min`);
    assert.ok(minutos <= 60, `Pausa (${minutos} min) deve ser <= 60 min`);
  }

  // Verifica aleatoriedade das pausas
  const uniquePausas = new Set(pausas);
  assert.ok(uniquePausas.size >= 5, 'Deve haver variação nas pausas longas entre 30 e 60 minutos');
});
