import { CONFIG } from './config.js';
import { initDatabase } from './db/database.js';
import { createServer } from './web/server.js';
import { whatsAppManager } from './whatsapp/client.js';
import { iniciarAgendadorDiario, pararAgendadorDiario } from './core/agendador.js';

async function main() {
  console.log('=== Iniciando Promo Réplica Autônoma ===');

  // 1. Inicializar Banco de Dados SQLite
  console.log('1. Inicializando banco de dados local...');
  initDatabase();
  console.log('Banco de dados SQLite pronto.');

  // 2. Inicializar Servidor Web e WebSockets
  console.log(`2. Subindo servidor web na porta ${CONFIG.port}...`);
  const app = await createServer();
  await app.listen({ port: CONFIG.port, host: CONFIG.host });
  console.log(`Painel Web disponível em: http://${CONFIG.host}:${CONFIG.port}`);

  // 3. Iniciar conexão Baileys com o WhatsApp
  console.log('3. Iniciando cliente WhatsApp...');
  whatsAppManager.start().catch((err) => {
    console.error('Falha ao iniciar WhatsApp:', err);
  });

  // 4. Iniciar Agendador Diário (Mensagem de Abertura às 07:00)
  console.log('4. Inicializando agendador diário de comunidade...');
  iniciarAgendadorDiario(whatsAppManager);

  // Tratamento de encerramento gracioso
  const shutdown = async () => {
    console.log('\nEncerrando aplicação...');
    pararAgendadorDiario();
    try {
      await app.close();
    } catch {}
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  process.on('exit', (code) => {
    console.log(`[PROCESS EXIT] Node process saindo com código: ${code}`);
  });

  process.on('beforeExit', (code) => {
    console.log(`[PROCESS BEFORE_EXIT] Código: ${code}`);
  });

  process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[UNHANDLED REJECTION]', reason);
  });

  // Heartbeat para garantir que o event loop permaneça ativo 24/7
  setInterval(() => {}, 60000);
}

main().catch((err) => {
  console.error('Erro fatal ao iniciar:', err);
  process.exit(1);
});
