import { test } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../src/web/server.js';
import { createSessionToken } from '../src/web/auth.js';

test('Endpoint Finanças Despesas - GET /api/financas/despesas e CSV', async () => {
  const app = await createServer();
  const token = createSessionToken('admin');
  const headers = { cookie: `promo_session=${token}` };

  // Testar listagem geral
  const res = await app.inject({
    method: 'GET',
    url: '/api/financas/despesas',
    headers
  });

  assert.strictEqual(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.strictEqual(body.ok, true);
  assert.ok(body.resumo);
  assert.ok(Array.isArray(body.resumo.itens));

  // Testar exportar CSV
  const resCsv = await app.inject({
    method: 'GET',
    url: '/api/financas/despesas/exportar-csv',
    headers
  });
  assert.strictEqual(resCsv.statusCode, 200);
  assert.ok(resCsv.headers['content-type']?.includes('text/csv'));
  assert.ok(resCsv.body.includes('RELATÓRIO DE DESPESAS'));
});
