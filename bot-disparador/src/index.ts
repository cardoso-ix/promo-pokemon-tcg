import dotenv from 'dotenv';
dotenv.config();

import { createServer } from './web/server.js';
import { getConfig, logSistema } from './db/database.js';
import { dispatchEngine } from './core/engine.js';
import { whatsapp } from './whatsapp/client.js';

async function main() {
  console.log('====================================================');
  console.log('   BOT DISPARADOR & ATENDIMENTO IA (DEEPSEEK V4)    ');
  console.log('====================================================');

  const porta = process.env.PORT ? parseInt(process.env.PORT, 10) : parseInt(getConfig('porta', '3333'), 10);
  const server = await createServer();

  try {
    await server.listen({ port: porta, host: '0.0.0.0' });
    console.log(`[PAINEL WEB] Servidor rodando em: http://localhost:${porta}`);
    logSistema('info', 'sistema', `Painel Web iniciado com sucesso na porta ${porta}`);

    // Iniciar motor de fila em segundo plano
    dispatchEngine.start();
  } catch (err: any) {
    console.error(`Erro ao iniciar servidor na porta ${porta}:`, err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nEncerrando bot disparador com segurança...');
    dispatchEngine.stop();
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Falha fatal na inicialização:', err);
});
