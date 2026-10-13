import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/db/database.js';
import { financasService } from '../src/analytics/financas.service.js';

describe('Balanço Financeiro DRE - Modo Total Geral (Todo o Período) vs Mensal Isolado', () => {
  test('getBalancoMensal("total") deve somar todos os meses desde o início (Setembro + Outubro)', async () => {
    // Garantir ao menos 1 registro em 2026-09 e 1 em 2026-10 para o teste
    db.prepare(`
      INSERT INTO financas_lancamentos_diarios (
        data_lancamento, lucro_bruto, vendas_brutas, gasto_campanhas, cliques_meta, impressoes_meta, origem, descricao, categoria
      ) VALUES (?, ?, ?, ?, ?, ?, 'manual', 'Teste Setembro', 'mercado_livre')
      ON CONFLICT(data_lancamento) DO NOTHING
    `).run('2026-09-15', 120.50, 1205.00, 35.00, 25, 1500);

    db.prepare(`
      INSERT INTO financas_lancamentos_diarios (
        data_lancamento, lucro_bruto, vendas_brutas, gasto_campanhas, cliques_meta, impressoes_meta, origem, descricao, categoria
      ) VALUES (?, ?, ?, ?, ?, ?, 'manual', 'Teste Outubro', 'mercado_livre')
      ON CONFLICT(data_lancamento) DO NOTHING
    `).run('2026-10-03', 99.04, 949.96, 38.75, 169, 2835);

    const balancoSetembro = await financasService.getBalancoMensal('2026-09');
    const balancoOutubro = await financasService.getBalancoMensal('2026-10');
    const balancoTotal = await financasService.getBalancoMensal('total');

    assert.equal(balancoTotal.mesReferencia, 'total', 'mesReferencia deve ser "total" quando solicitado o histórico completo');
    assert.ok(
      balancoTotal.itens.length >= balancoSetembro.itens.length + balancoOutubro.itens.length,
      `Total de dias (${balancoTotal.itens.length}) deve conter todos os dias de Setembro (${balancoSetembro.itens.length}) + Outubro (${balancoOutubro.itens.length})`
    );

    const somaLucroMeses = Number((balancoSetembro.totalLucroBruto + balancoOutubro.totalLucroBruto).toFixed(2));
    const somaGastoMeses = Number((balancoSetembro.totalGastoCampanhas + balancoOutubro.totalGastoCampanhas).toFixed(2));

    assert.ok(
      balancoTotal.totalLucroBruto >= somaLucroMeses,
      `Lucro bruto total (${balancoTotal.totalLucroBruto}) deve somar todos os meses (${somaLucroMeses})`
    );
    assert.ok(
      balancoTotal.totalGastoCampanhas >= somaGastoMeses,
      `Gasto total de campanhas (${balancoTotal.totalGastoCampanhas}) deve somar todos os meses (${somaGastoMeses})`
    );

    // Verificar que o mês de Outubro isolado reflete exatamente a soma dos seus itens diários (sem inflar com os 30 dias de Setembro)
    const somaItensOutubro = Number(
      balancoOutubro.itens.reduce((acc, i) => acc + i.lucroBruto, 0).toFixed(2)
    );
    assert.equal(
      balancoOutubro.totalLucroBruto,
      somaItensOutubro,
      'O totalLucroBruto do mês deve corresponder exatamente à soma dos dias daquele mês'
    );
  });
});
