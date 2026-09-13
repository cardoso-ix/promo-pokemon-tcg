async function main() {
  const loginRes = await fetch('https://bot-disparador-ia-production.up.railway.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'eduardo', password: '04052001' })
  });
  const cookie = loginRes.headers.get('set-cookie');

  const logsRes = await fetch('https://bot-disparador-ia-production.up.railway.app/api/logs', {
    headers: { 'Cookie': cookie }
  });
  const logs = await logsRes.json();
  const list = logs.logs || logs;
  console.log('Last 25 logs:');
  for (const l of list.slice(0, 25)) {
    console.log(`${l.criado_em} [${l.nivel}] [${l.categoria}] ${l.mensagem}`);
  }

  const campRes = await fetch('https://bot-disparador-ia-production.up.railway.app/api/campanhas', {
    headers: { 'Cookie': cookie }
  });
  const camps = await campRes.json();
  console.log('Campanhas:', JSON.stringify(camps, null, 2));

  const filaRes = await fetch('https://bot-disparador-ia-production.up.railway.app/api/campanhas/4/fila', {
    headers: { 'Cookie': cookie }
  });
  const fila = await filaRes.json();
  const fList = fila.fila || fila;
  console.log('Fila items count:', fList.length);
  const sent = fList.filter(x => x.status === 'enviado');
  console.log('Enviados count:', sent.length);
  console.log('Enviados items:', JSON.stringify(sent, null, 2));
}

main().catch(console.error);
