import dotenv from 'dotenv';
dotenv.config();

import http from 'node:http';
import { createServer } from './web/server.js';
import { getConfig, logSistema } from './db/database.js';
import { dispatchEngine } from './core/engine.js';
import { whatsapp } from './whatsapp/client.js';

async function main() {
  console.log('====================================================');
  console.log('   BOT DISPARADOR & ATENDIMENTO IA (DEEPSEEK V4)    ');
  console.log('====================================================');

  const defaultPort = process.env.NODE_ENV === 'production' ? '3000' : '3333';
  const porta = process.env.PORT ? parseInt(process.env.PORT, 10) : parseInt(getConfig('porta', defaultPort), 10);
  const server = await createServer();

  let secondaryServer: http.Server | null = null;

  try {
    await server.listen({ port: porta, host: '0.0.0.0' });
    console.log(`[PAINEL WEB] Servidor rodando em: http://localhost:${porta}`);
    logSistema('info', 'sistema', `Painel Web iniciado com sucesso na porta ${porta}`);

    // Abrir espelho na outra porta (3000 ou 3333) para compatibilidade instantânea com Railway e ambiente local
    const fallbackPort = porta === 3000 ? 3333 : 3000;
    try {
      secondaryServer = http.createServer((req, res) => {
        server.server.emit('request', req, res);
      });
      secondaryServer.on('error', () => {
        // Se a porta secundária estiver ocupada (ex: rodando localmente com o replicador aberto), ignora
      });
      secondaryServer.listen(fallbackPort, '0.0.0.0', () => {
        console.log(`[PAINEL WEB] Porta secundária ativa em: http://localhost:${fallbackPort}`);
      });
    } catch {
      // Ignora erro se porta secundária não estiver livre
    }

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
    if (secondaryServer) {
      try { secondaryServer.close(); } catch {}
    }
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Falha fatal na inicialização:', err);
});
