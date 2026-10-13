import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { db, obterMetricasComunidade } from '../src/db/database.js';
import { getBrazilToday, getBrazilDaysAgo } from '../src/utils/date.js';

describe('Métricas de Comunidade & Retenção WhatsApp (Fuso Brasília & Filtro Grupo VIP)', () => {
  const vipGroupId = '120363429126612309@g.us';
  const thirdPartyGroupId = '120363405694964472@g.us';

  test('deve contabilizar corretamente entradas/saídas após 21h BRT (00h+ UTC) e filtrar apenas o grupo VIP oficial', () => {
    const hojeBrt = getBrazilToday();
    const ontemBrt = getBrazilDaysAgo(1);

    // Limpar eventos de teste anteriores para estes grupos
    db.prepare('DELETE FROM comunidade_eventos WHERE chat_id IN (?, ?)').run(vipGroupId, thirdPartyGroupId);

    // Calcular data UTC correspondente a 22:30 BRT de hoje (que já é 01:30 UTC do dia seguinte!)
    const [ano, mes, dia] = hojeBrt.split('-').map(Number);
    const dataUtcApos21hBrt = new Date(Date.UTC(ano, mes - 1, dia + 1, 1, 30, 0))
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19);

    // Calcular data UTC correspondente a 15:00 BRT de hoje (18:00 UTC do mesmo dia)
    const dataUtcTardeHoje = new Date(Date.UTC(ano, mes - 1, dia, 18, 0, 0))
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19);

    // Calcular data UTC correspondente a 14:00 BRT de ontem (17:00 UTC de ontem)
    const [anoOntem, mesOntem, diaOntem] = ontemBrt.split('-').map(Number);
    const dataUtcTardeOntem = new Date(Date.UTC(anoOntem, mesOntem - 1, diaOntem, 17, 0, 0))
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19);

    const insertStmt = db.prepare(`
      INSERT INTO comunidade_eventos (chat_id, tipo, telefone, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    // Inserir 4 entradas no grupo VIP hoje (2 à tarde e 2 após as 21h BRT / 01:30 UTC)
    insertStmt.run(vipGroupId, 'entrada', '5511999990001', dataUtcTardeHoje);
    insertStmt.run(vipGroupId, 'entrada', '5511999990002', dataUtcTardeHoje);
    insertStmt.run(vipGroupId, 'entrada', '5511999990003', dataUtcApos21hBrt);
    insertStmt.run(vipGroupId, 'entrada', '5511999990004', dataUtcApos21hBrt);

    // Inserir 1 saída no grupo VIP hoje após as 21h BRT
    insertStmt.run(vipGroupId, 'saida', '5511999990005', dataUtcApos21hBrt);

    // Inserir 5 saídas em grupo de terceiro hoje (NÃO devem contaminar as métricas do grupo VIP)
    for (let i = 0; i < 5; i++) {
      insertStmt.run(thirdPartyGroupId, 'saida', `551188888000${i}`, dataUtcTardeHoje);
    }

    // Inserir 3 entradas e 1 saída ontem no grupo VIP
    insertStmt.run(vipGroupId, 'entrada', '5511999990010', dataUtcTardeOntem);
    insertStmt.run(vipGroupId, 'entrada', '5511999990011', dataUtcTardeOntem);
    insertStmt.run(vipGroupId, 'entrada', '5511999990012', dataUtcTardeOntem);
    insertStmt.run(vipGroupId, 'saida', '5511999990013', dataUtcTardeOntem);

    // Chamar obterMetricasComunidade sem passar chatId (como o Cockpit faz)
    const metricas = obterMetricasComunidade();

    assert.equal(metricas.totalEntradasHoje, 4, 'Deve contar as 4 entradas de hoje no fuso de Brasília (incluindo pós-21h BRT)');
    assert.equal(metricas.totalSaidasHoje, 1, 'Deve contar apenas 1 saída do grupo VIP e ignorar as 5 saídas de grupos de terceiros');
    assert.equal(metricas.crescimentoLiquidoHoje, 3, 'Saldo líquido hoje deve ser +3');
    assert.equal(metricas.taxaRetencaoHoje, 75, 'Retenção de hoje (3 retidos de 4 entradas) deve ser 75%');
    assert.equal(metricas.totalEntradasOntem, 3, 'Deve contar 3 entradas de ontem no grupo VIP');
    assert.equal(metricas.totalSaidasOntem, 1, 'Deve contar 1 saída de ontem no grupo VIP');
    assert.equal(metricas.crescimentoLiquidoOntem, 2, 'Saldo líquido de ontem deve ser +2');

    // Limpeza pós-teste
    db.prepare('DELETE FROM comunidade_eventos WHERE chat_id IN (?, ?)').run(vipGroupId, thirdPartyGroupId);
  });
});
