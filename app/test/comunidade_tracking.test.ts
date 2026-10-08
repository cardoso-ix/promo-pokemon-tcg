import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  initDatabase,
  registrarEventoComunidade,
  obterMetricasComunidade
} from '../src/db/database.js';
import { calcularFadigaCriativo } from '../src/analytics/meta.service.js';

describe('Rastreamento de Comunidade WhatsApp & Fadiga de Criativo Meta Ads', () => {
  before(() => {
    initDatabase();
  });

  it('registrarEventoComunidade deve registrar entradas e saídas no banco SQLite', () => {
    const grupoId = '120363429126612309@g.us';
    registrarEventoComunidade(grupoId, 'entrada', '5511999887766');
    registrarEventoComunidade(grupoId, 'entrada', '5521988776655');
    registrarEventoComunidade(grupoId, 'saida', '5531977665544');

    const metricas = obterMetricasComunidade(grupoId);
    assert.ok(metricas.totalEntradasHoje >= 2, 'Deveria ter ao menos 2 entradas hoje');
    assert.ok(metricas.totalSaidasHoje >= 1, 'Deveria ter ao menos 1 saída hoje');
    assert.equal(metricas.crescimentoLiquidoHoje, metricas.totalEntradasHoje - metricas.totalSaidasHoje);
  });

  it('calcularFadigaCriativo deve classificar corretamente a saturação de audiência por frequência', () => {
    // Frequência baixa (< 1.5x) -> Saudável
    const diag1 = calcularFadigaCriativo(1.18);
    assert.equal(diag1.status, 'saudavel');
    assert.equal(diag1.nivelAlerta, 'baixo');
    assert.match(diag1.recomendacao, /fresco/i);

    // Frequência média (1.5x a 1.8x) -> Atenção
    const diag2 = calcularFadigaCriativo(1.65);
    assert.equal(diag2.status, 'atencao');
    assert.equal(diag2.nivelAlerta, 'medio');

    // Frequência alta (>= 1.8x) -> Saturação / Fadiga
    const diag3 = calcularFadigaCriativo(2.15);
    assert.equal(diag3.status, 'saturado');
    assert.equal(diag3.nivelAlerta, 'alto');
    assert.match(diag3.recomendacao, /trocar criativo/i);
  });
});
