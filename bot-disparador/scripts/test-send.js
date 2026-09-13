async function main() {
  const loginRes = await fetch('https://bot-disparador-ia-production.up.railway.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'eduardo', password: '04052001' })
  });
  const cookie = loginRes.headers.get('set-cookie');

  // Enviar teste para o próprio número conectado: 5586920026214
  console.log('Enviando mensagem de teste para 5586920026214...');
  const testRes = await fetch('https://bot-disparador-ia-production.up.railway.app/api/whatsapp/test-send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      phone: '5586920026214',
      text: '⚡ Teste direto: se você recebeu esta mensagem, a conexão do WhatsApp está funcionando perfeitamente!'
    })
  });
  const res = await testRes.json();
  console.log('Resultado do envio:', res);
}

main().catch(console.error);
