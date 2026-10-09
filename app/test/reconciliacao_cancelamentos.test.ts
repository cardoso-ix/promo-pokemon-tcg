import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/db/database.js';
import { meliAffiliateService } from '../src/analytics/meli-affiliate.service.js';
import { financasService } from '../src/analytics/financas.service.js';
import { getBrazilToday, getBrazilDaysAgo } from '../src/utils/date.js';

test('Reconciliação Automática de Cancelamentos - Lookback Window de 7 Dias', async (t) => {
  const diaOntem = getBrazilDaysAgo(1);

  // 1. Setup: Inserir um dia anterior com valor pré-cancelamento no SQLite (ex: R$ 150,00)
  db.prepare(`
    INSERT INTO financas_lancamentos_diarios (
      data_lancamento, lucro_bruto, vendas_brutas, gasto_campanhas, cliques_meta, impressoes_meta, origem, descricao, categoria
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(data_lancamento) DO UPDATE SET
      lucro_bruto = excluded.lucro_bruto,
      vendas_brutas = excluded.vendas_brutas,
      origem = excluded.origem,
      descricao = excluded.descricao
  `).run(diaOntem, 150.00, 1500.00, 40.00, 20, 2000, 'auto', 'Comissões pré-cancelamento', 'mercado_livre');

  // 2. Simular que o Mercado Livre retornou no extrato oficial (dailyData) um valor menor por causa de cancelamento (R$ 115,00)
  const mockDailyData = [
    {
      date: diaOntem,
      orders: 10,
      quantity: 11,
      earnings: 115.00,
      touchpoints: 25,
      cvr: 0.4
    }
  ];

  // 3. Executa a reconciliação
  const resultado = meliAffiliateService.reconciliarJanelaRetroativa(mockDailyData, 7);

  assert.equal(resultado.totalReconciliados, 1, 'Deve reconciliar 1 dia com divergência');
  assert.equal(resultado.cancelamentos, 1, 'Deve identificar que foi um cancelamento');

  // 4. Verifica se o banco SQLite foi atualizado para baixo (R$ 115,00) com status auto_reconciliado
  const lancamentoApos = db.prepare('SELECT * FROM financas_lancamentos_diarios WHERE data_lancamento = ?').get(diaOntem) as any;
  assert.equal(Number(lancamentoApos.lucro_bruto), 115.00, 'Lucro bruto deve ser atualizado para R$ 115,00');
  assert.equal(lancamentoApos.origem, 'auto_reconciliado', 'Origem deve ser auto_reconciliado');
  assert.ok(lancamentoApos.descricao.toLowerCase().includes('cancelamento'), 'Descrição deve sinalizar cancelamento abatido');

  // 5. Testar que o Balanço Mensal incorpora o valor recalculado pós-cancelamento
  const mesAtual = diaOntem.slice(0, 7);
  const balanco = await financasService.getBalancoMensal(mesAtual);
  const itemOntem = balanco.itens.find(i => i.dataLancamento === diaOntem);

  assert.ok(itemOntem, 'Item de ontem deve existir no balanço');
  assert.equal(itemOntem.lucroBruto, 115.00, 'Balanço deve refletir R$ 115,00');
  assert.equal(Number(itemOntem.saldoDia.toFixed(2)), Number((115.00 - itemOntem.gastoCampanhas).toFixed(2)), 'Saldo do dia deve ser lucroBruto - gastoCampanhas');
});

test('Reconciliação Automática - Ignora dias sem divergência e dias fora da janela', () => {
  const diaAntigo = getBrazilDaysAgo(15); // Fora da janela de 7 dias
  const diaOntem = getBrazilDaysAgo(1);

  const mockDailyData = [
    {
      date: diaOntem,
      orders: 10,
      quantity: 11,
      earnings: 115.00, // Mesmo valor já persistido no teste anterior
      touchpoints: 25,
      cvr: 0.4
    },
    {
      date: diaAntigo,
      orders: 5,
      quantity: 5,
      earnings: 50.00,
      touchpoints: 10,
      cvr: 0.5
    }
  ];

  const resultado = meliAffiliateService.reconciliarJanelaRetroativa(mockDailyData, 7);
  assert.equal(resultado.totalReconciliados, 0, 'Não deve fazer updates desnecessários em dados idênticos ou fora da janela');
});
