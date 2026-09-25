import { test } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../src/web/server.js';
import { createSessionToken } from '../src/web/auth.js';
import {
  salvarLancamentoDiario,
  listarLancamentosDiarios,
  deleteLancamentoDiario,
  getBalancoMensal,
  getPercentualReinvestimento,
  setPercentualReinvestimento
} from '../src/db/database.js';
import { exportarBalancoMensalCsv } from '../src/core/financas.js';

test('Balanço Financeiro e Lançamentos Diários - Core Database & Regra 70% Reinvestimento', () => {
  const mesTeste = '2026-10';

  // 1. Garantir percentual padrão de 70%
  setPercentualReinvestimento(70);
  assert.strictEqual(getPercentualReinvestimento(), 70);

  // 2. Criar lançamentos diários
  const id1 = salvarLancamentoDiario({
    dataLancamento: '2026-10-01',
    gastoCampanhas: 100.0,
    lucroBruto: 500.0,
    descricao: 'Meta Ads Campanha 1 + Comissões ML'
  });
  assert.ok(id1 > 0);

  const id2 = salvarLancamentoDiario({
    dataLancamento: '2026-10-02',
    gastoCampanhas: 200.0,
    lucroBruto: 800.0,
    descricao: 'Google Ads + Vendas Diretas'
  });
  assert.ok(id2 > 0);

  // 3. Listar lançamentos
  const itens = listarLancamentosDiarios(mesTeste);
  assert.ok(itens.length >= 2);
  const itemEncontrado = itens.find(it => it.id === id1);
  assert.ok(itemEncontrado);
  assert.strictEqual(itemEncontrado.gasto_campanhas, 100.0);
  assert.strictEqual(itemEncontrado.lucro_bruto, 500.0);

  // 4. Balanço Mensal com cálculo de 70% de reinvestimento
  // Total Gasto = 300 | Total Lucro Bruto = 1300 | Lucro Líquido = 1000
  // 70% Reinvestimento = 700 | 30% Retirada = 300
  const balanco = getBalancoMensal(mesTeste);
  assert.strictEqual(balanco.mesReferencia, mesTeste);
  assert.strictEqual(balanco.totalGastoCampanhas, 300.0);
  assert.strictEqual(balanco.totalLucroBruto, 1300.0);
  assert.strictEqual(balanco.resultadoLiquido, 1000.0);
  assert.strictEqual(balanco.status, 'lucro');
  assert.strictEqual(balanco.percentualReinvestimento, 70);
  assert.strictEqual(balanco.valorReinvestimentoCampanhas, 700.0);
  assert.strictEqual(balanco.valorLucroDisponivel, 300.0);

  // 5. Testar alteração da flag de reinvestimento (ex: 80%)
  setPercentualReinvestimento(80);
  assert.strictEqual(getPercentualReinvestimento(), 80);
  const balanco80 = getBalancoMensal(mesTeste);
  assert.strictEqual(balanco80.percentualReinvestimento, 80);
  assert.strictEqual(balanco80.valorReinvestimentoCampanhas, 800.0);
  assert.strictEqual(balanco80.valorLucroDisponivel, 200.0);

  // 6. Testar exportação de CSV do balanço
  const csv = exportarBalancoMensalCsv(mesTeste);
  assert.ok(csv.includes('BALANÇO FINANCEIRO MENSAL E REINVESTIMENTO EM TRÁFEGO'));
  assert.ok(csv.includes('1.000,00') || csv.includes('1000,00'));
  assert.ok(csv.includes('Meta Ads Campanha 1'));

  // 7. Cleanup
  deleteLancamentoDiario(id1);
  deleteLancamentoDiario(id2);
  const posDelete = listarLancamentosDiarios(mesTeste);
  assert.strictEqual(posDelete.some(it => it.id === id1 || it.id === id2), false);
});

test('Balanço Financeiro - Endpoints de API REST (Fastify)', async () => {
  const app = await createServer();
  const token = createSessionToken('admin');
  const headers = { cookie: `promo_session=${token}` };
  const mesApi = '2026-11';

  // 1. Configurar flag para 75%
  const resConfig = await app.inject({
    method: 'POST',
    url: '/api/financas/config-reinvestimento',
    headers,
    payload: { percentual: 75 }
  });
  assert.strictEqual(resConfig.statusCode, 200);
  const bodyConfig = JSON.parse(resConfig.body);
  assert.strictEqual(bodyConfig.ok, true);
  assert.strictEqual(bodyConfig.percentual, 75);

  // 2. Inserir lançamento via POST /api/financas/lancamento
  const resPost = await app.inject({
    method: 'POST',
    url: '/api/financas/lancamento',
    headers,
    payload: {
      dataLancamento: '2026-11-10',
      gastoCampanhas: 250.0,
      lucroBruto: 1250.0,
      descricao: 'Teste API Lançamento Manual'
    }
  });
  assert.strictEqual(resPost.statusCode, 200);
  const bodyPost = JSON.parse(resPost.body);
  assert.strictEqual(bodyPost.ok, true);
  const lancamentoId = bodyPost.id;
  assert.ok(lancamentoId > 0);

  // 3. Consultar Balanço via GET /api/financas/balanco?mes=2026-11
  const resBalanco = await app.inject({
    method: 'GET',
    url: `/api/financas/balanco?mes=${mesApi}`,
    headers
  });
  assert.strictEqual(resBalanco.statusCode, 200);
  const bodyBalanco = JSON.parse(resBalanco.body);
  assert.strictEqual(bodyBalanco.ok, true);
  assert.strictEqual(bodyBalanco.balanco.totalGastoCampanhas, 250.0);
  assert.strictEqual(bodyBalanco.balanco.totalLucroBruto, 1250.0);
  assert.strictEqual(bodyBalanco.balanco.resultadoLiquido, 1000.0);
  assert.strictEqual(bodyBalanco.balanco.percentualReinvestimento, 75);
  assert.strictEqual(bodyBalanco.balanco.valorReinvestimentoCampanhas, 750.0);
  assert.strictEqual(bodyBalanco.balanco.valorLucroDisponivel, 250.0);

  // 4. Exportar CSV do balanço
  const resCsv = await app.inject({
    method: 'GET',
    url: `/api/financas/balanco/exportar-csv?mes=${mesApi}`,
    headers
  });
  assert.strictEqual(resCsv.statusCode, 200);
  assert.ok(resCsv.headers['content-type']?.includes('text/csv'));
  assert.ok(resCsv.body.includes('Teste API Lançamento Manual'));

  // 5. Deletar lançamento via DELETE /api/financas/lancamento/:id
  const resDel = await app.inject({
    method: 'DELETE',
    url: `/api/financas/lancamento/${lancamentoId}`,
    headers
  });
  assert.strictEqual(resDel.statusCode, 200);
  const bodyDel = JSON.parse(resDel.body);
  assert.strictEqual(bodyDel.ok, true);
});
