async function main() {
  const loginRes = await fetch('https://bot-disparador-ia-production.up.railway.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.ADMIN_USER || 'admin',
      password: process.env.ADMIN_PASS || 'promo2026'
    })
  });
  const cookie = loginRes.headers.get('set-cookie');

  // Let's check the logs or add a debug inspect
  const logsRes = await fetch('https://bot-disparador-ia-production.up.railway.app/api/logs', {
    headers: { 'Cookie': cookie }
  });
  const logs = await logsRes.json();
  const list = logs.logs || logs;
  const iaLogs = list.filter(x => x.categoria === 'deepseek');
  console.log('IA logs count:', iaLogs.length);
  console.log('IA logs:', JSON.stringify(iaLogs, null, 2));
}

main().catch(console.error);
