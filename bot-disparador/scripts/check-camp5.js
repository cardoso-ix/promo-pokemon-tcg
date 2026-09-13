async function main() {
  const loginRes = await fetch('https://bot-disparador-ia-production.up.railway.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'eduardo', password: '04052001' })
  });
  const cookie = loginRes.headers.get('set-cookie');

  const campRes = await fetch('https://bot-disparador-ia-production.up.railway.app/api/campanhas/5/fila', {
    headers: { 'Cookie': cookie }
  });
  const data = await campRes.json();
  const list = data.fila || data;
  console.log('Fila count:', list.length);
  const sent = list.filter(x => x.status === 'enviado');
  console.log('Sent count:', sent.length);
  sent.forEach(s => {
    console.log(`ID: ${s.id} | JID: ${s.destinatario_jid} | Status: ${s.status} | Time: ${s.enviado_em}`);
  });
}

main().catch(console.error);
