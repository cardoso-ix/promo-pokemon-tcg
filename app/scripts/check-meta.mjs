async function main() {
  const loginRes = await fetch('http://108.174.145.77:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'promo2026' })
  });
  const cookie = loginRes.headers.get('set-cookie');
  const headers = { 'Cookie': cookie, 'Content-Type': 'application/json' };

  console.log('--- 1. CONFIGURAÇÃO META ADS ---');
  const configRes = await fetch('http://108.174.145.77:3000/api/integrations/meta/config', { headers });
  const configData = await configRes.json();
  console.log('Config Meta:', JSON.stringify(configData, null, 2));

  console.log('\n--- 2. TESTANDO ROTAS DE SYNC ---');
  // Checar se rota de sync existe
  const syncRes = await fetch('http://108.174.145.77:3000/api/integrations/meta/sync', {
    method: 'POST',
    headers,
    body: JSON.stringify({ force: true })
  });
  console.log('Status /api/integrations/meta/sync:', syncRes.status);
  const syncData = await syncRes.text();
  console.log('Sync response:', syncData);

  console.log('\n--- 3. BUSCANDO INSIGHTS DE HOJE E RECENTES ---');
  const hoje = '2026-10-06';
  const urlInsightsHoje = 'http://108.174.145.77:3000/api/dashboard/meta-insights?startDate=' + hoje + '&endDate=' + hoje;
  const insightsHojeRes = await fetch(urlInsightsHoje, { headers });
  console.log('Status Insights Hoje:', insightsHojeRes.status);
  const insightsHojeData = await insightsHojeRes.json();
  console.log('Insights Hoje (' + hoje + '):', JSON.stringify(insightsHojeData, null, 2));

  // Buscar últimos 7 dias também para ter contexto de comparação
  const urlInsights7d = 'http://108.174.145.77:3000/api/dashboard/meta-insights?startDate=2026-09-30&endDate=' + hoje;
  const insights7dRes = await fetch(urlInsights7d, { headers });
  const insights7dData = await insights7dRes.json();
  console.log('\nInsights Últimos 7 dias:', JSON.stringify(insights7dData, null, 2));
}

main().catch(err => console.error('Erro no script:', err));
