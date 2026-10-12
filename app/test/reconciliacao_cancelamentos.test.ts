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

test('Reconciliação Automática - Calibra vendas_brutas reais (R$ 854,32) e detecta venda cancelada (R$ 0) via recentSales (Caso 11/10)', async () => {
  const diaOntem = getBrazilDaysAgo(1);
  const [ano, mes, dia] = diaOntem.split('-');
  const dataBrOntem = `${dia}/${mes}/${ano}`;

  // Simula estado onde o dia foi salvo inicialmente com estimativa 10x (651.60) em vez da soma real (854.32)
  db.prepare(`
    INSERT INTO financas_lancamentos_diarios (
      data_lancamento, lucro_bruto, vendas_brutas, gasto_campanhas, cliques_meta, impressoes_meta, origem, descricao, categoria
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(data_lancamento) DO UPDATE SET
      lucro_bruto = excluded.lucro_bruto,
      vendas_brutas = excluded.vendas_brutas,
      gasto_campanhas = excluded.gasto_campanhas,
      origem = excluded.origem,
      descricao = excluded.descricao
  `).run(diaOntem, 65.16, 651.60, 77.93, 53, 4896, 'auto', 'Mercado Livre Afiliados (Painel Oficial)', 'mercado_livre');

  const mockDailyData = [
    {
      date: diaOntem,
      orders: 4,
      quantity: 4,
      earnings: 65.16,
      touchpoints: 99,
      cvr: 0.04040404
    }
  ];

  const mockRecentSales = [
    {
      id: '2000018927192726',
      date: dataBrOntem,
      productName: 'Box Pokémon Com Pôster Celebração De 30 Anos',
      productImage: '',
      link: '',
      storeName: 'ALETAMIAO',
      saleValue: 0,
      saleUnits: 1,
      commissionValue: 0,
      commissionPercentage: 17
    },
    {
      id: '2000018926611898',
      date: dataBrOntem,
      productName: 'Pokemon Tcg - Gemstone Bag Badge Set Booster Chinês',
      productImage: '',
      link: '',
      storeName: 'VALENSTCG',
      saleValue: 170,
      saleUnits: 1,
      commissionValue: 16.73,
      commissionPercentage: 12
    },
    {
      id: '2000018926504122',
      date: dataBrOntem,
      productName: 'Álbum Mundial De Clubes 2025 Fifa Completo',
      productImage: '',
      link: '',
      storeName: 'MARIAAPPARECIDAOLIVEIRA',
      saleValue: 330,
      saleUnits: 1,
      commissionValue: 16.24,
      commissionPercentage: 6
    },
    {
      id: '2000018925418984',
      date: dataBrOntem,
      productName: 'Central Shield Básico 400 Sleeves',
      productImage: '',
      link: '',
      storeName: 'SHOPCAVINI',
      saleValue: 54.33,
      saleUnits: 1,
      commissionValue: 2.67,
      commissionPercentage: 6
    },
    {
      id: '2000018921598842',
      date: dataBrOntem,
      productName: 'Pokemon Combo De Booster Celebracoes 30 Anos',
      productImage: '',
      link: '',
      storeName: 'PHCARVALHOME',
      saleValue: 299.99,
      saleUnits: 1,
      commissionValue: 29.52,
      commissionPercentage: 12
    }
  ];

  const resultado = meliAffiliateService.reconciliarJanelaRetroativa(mockDailyData, 7, mockRecentSales);
  assert.equal(resultado.totalReconciliados, 1, 'Deve reconciliar o dia para corrigir vendas_brutas e registrar cancelamento');
  assert.equal(resultado.cancelamentos, 1, 'Deve contabilizar o cancelamento detectado em recentSales');

  const row = db.prepare('SELECT * FROM financas_lancamentos_diarios WHERE data_lancamento = ?').get(diaOntem) as any;
  assert.equal(Number(row.lucro_bruto), 65.16, 'Comissão de ontem deve ser R$ 65,16');
  assert.equal(Number(row.vendas_brutas), 854.32, 'Vendas estimadas de ontem devem ser R$ 854,32 (soma real sem a cancelada)');
  assert.equal(row.origem, 'auto_reconciliado');
});

test('Reconciliação Automática - Zera lucro_bruto se 100% das vendas do dia anterior forem canceladas (earnings = 0 com touchpoints > 0)', () => {
  const diaDoisAtras = getBrazilDaysAgo(2);

  db.prepare(`
    INSERT INTO financas_lancamentos_diarios (
      data_lancamento, lucro_bruto, vendas_brutas, gasto_campanhas, cliques_meta, impressoes_meta, origem, descricao, categoria
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(data_lancamento) DO UPDATE SET
      lucro_bruto = excluded.lucro_bruto,
      vendas_brutas = excluded.vendas_brutas,
      origem = excluded.origem,
      categoria = excluded.categoria
  `).run(diaDoisAtras, 42.50, 350.00, 30.00, 15, 1200, 'auto', 'Comissão inicial', 'mercado_livre');

  const mockDailyData = [
    {
      date: diaDoisAtras,
      orders: 0,
      quantity: 0,
      earnings: 0,
      touchpoints: 85,
      cvr: 0
    }
  ];

  const resultado = meliAffiliateService.reconciliarJanelaRetroativa(mockDailyData, 7);
  assert.equal(resultado.totalReconciliados, 1, 'Deve reconciliar dia onde todas as vendas foram canceladas');
  assert.equal(resultado.cancelamentos, 1, 'Deve registrar como cancelamento');

  const row = db.prepare('SELECT * FROM financas_lancamentos_diarios WHERE data_lancamento = ?').get(diaDoisAtras) as any;
  assert.equal(Number(row.lucro_bruto), 0, 'Lucro bruto deve ser zerado após cancelamento total');
  assert.equal(Number(row.vendas_brutas), 0, 'Vendas brutas devem ser zeradas após cancelamento total');
});

