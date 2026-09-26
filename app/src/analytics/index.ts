import type { FastifyInstance } from 'fastify';
import { initAnalyticsDatabase } from './db.js';
import { registerAnalyticsRoutes } from './routes.js';

export * from './schema.js';
export * from './db.js';
export * from './security.js';
export * from './meli.service.js';
export * from './meta.service.js';
export * from './analytics.service.js';
export * from './routes.js';

/**
 * Inicializa as tabelas no PostgreSQL (se configurado) e registra as rotas no Fastify
 */
export async function setupAnalyticsModule(app: FastifyInstance) {
  // Inicialização assíncrona do banco PostgreSQL em background
  initAnalyticsDatabase().catch((err: unknown) => {
    console.warn('[Analytics Module] PostgreSQL não inicializado:', err);
  });

  // Registra as rotas de API
  await registerAnalyticsRoutes(app);
  console.log('[Analytics Module] Módulo de Ingestão Analítica (Meli + Meta) registrado com sucesso.');
}
