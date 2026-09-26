import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || '';

let pool: pg.Pool | null = null;
let drizzleDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDbPool(): pg.Pool | null {
  if (!DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' && !DATABASE_URL.includes('localhost')
        ? { rejectUnauthorized: false }
        : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }
  return pool;
}

export function getAnalyticsDb() {
  const p = getDbPool();
  if (!p) return null;
  if (!drizzleDb) {
    drizzleDb = drizzle(p, { schema });
  }
  return drizzleDb;
}

/**
 * Cria as tabelas analíticas caso ainda não existam no PostgreSQL
 */
export async function initAnalyticsDatabase(): Promise<boolean> {
  const p = getDbPool();
  if (!p) {
    console.warn('[Analytics DB] DATABASE_URL não configurada no .env. Ingestão em modo standalone.');
    return false;
  }

  const client = await p.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS integration_tokens (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(50) NOT NULL UNIQUE,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS meli_orders (
        order_id VARCHAR(50) PRIMARY KEY,
        date_created TIMESTAMPTZ NOT NULL,
        date_closed TIMESTAMPTZ,
        total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        marketplace_fee NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        shipping_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(50) NOT NULL,
        buyer_id VARCHAR(50),
        currency_id VARCHAR(10) DEFAULT 'BRL',
        raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_meli_orders_date ON meli_orders (date_created);
      CREATE INDEX IF NOT EXISTS idx_meli_orders_status ON meli_orders (status);

      CREATE TABLE IF NOT EXISTS meta_ad_insights (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        campaign_id VARCHAR(50) NOT NULL,
        campaign_name VARCHAR(255) NOT NULL,
        spend NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        impressions BIGINT NOT NULL DEFAULT 0,
        clicks BIGINT NOT NULL DEFAULT 0,
        ctr NUMERIC(8, 4) NOT NULL DEFAULT 0.0000,
        cpc NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        purchases INTEGER NOT NULL DEFAULT 0,
        purchase_value NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_meta_insight_date_campaign UNIQUE (date, campaign_id)
      );

      CREATE INDEX IF NOT EXISTS idx_meta_insights_date ON meta_ad_insights (date);

      CREATE TABLE IF NOT EXISTS daily_analytics_summary (
        date DATE PRIMARY KEY,
        total_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        total_orders INTEGER NOT NULL DEFAULT 0,
        total_fees NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        total_shipping NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        total_spend NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        blended_roas NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        avg_cac NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        net_operating_margin NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('[Analytics DB] Tabelas analíticas migradas e prontas no PostgreSQL.');
    return true;
  } catch (err: unknown) {
    console.error('[Analytics DB] Erro ao inicializar tabelas no PostgreSQL:', err);
    return false;
  } finally {
    client.release();
  }
}
