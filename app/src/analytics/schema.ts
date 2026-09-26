import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  numeric,
  integer,
  bigint,
  date,
  jsonb,
  uniqueIndex
} from 'drizzle-orm/pg-core';

// 1. Tokens de Integração (Mercado Livre e Meta Ads)
export const integrationTokens = pgTable('integration_tokens', {
  id: serial('id').primaryKey(),
  provider: varchar('provider', { length: 50 }).notNull().unique(), // 'mercadolivre' | 'meta_ads'
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// 2. Pedidos do Mercado Livre
export const meliOrders = pgTable('meli_orders', {
  orderId: varchar('order_id', { length: 50 }).primaryKey(),
  dateCreated: timestamp('date_created', { withTimezone: true }).notNull(),
  dateClosed: timestamp('date_closed', { withTimezone: true }),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
  paidAmount: numeric('paid_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
  marketplaceFee: numeric('marketplace_fee', { precision: 14, scale: 2 }).default('0.00').notNull(),
  shippingCost: numeric('shipping_cost', { precision: 14, scale: 2 }).default('0.00').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  buyerId: varchar('buyer_id', { length: 50 }),
  currencyId: varchar('currency_id', { length: 10 }).default('BRL'),
  rawData: jsonb('raw_data').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// 3. Métricas Diárias de Anúncios Meta Ads
export const metaAdInsights = pgTable(
  'meta_ad_insights',
  {
    id: serial('id').primaryKey(),
    date: date('date').notNull(),
    campaignId: varchar('campaign_id', { length: 50 }).notNull(),
    campaignName: varchar('campaign_name', { length: 255 }).notNull(),
    spend: numeric('spend', { precision: 14, scale: 2 }).default('0.00').notNull(),
    impressions: bigint('impressions', { mode: 'number' }).default(0).notNull(),
    clicks: bigint('clicks', { mode: 'number' }).default(0).notNull(),
    ctr: numeric('ctr', { precision: 8, scale: 4 }).default('0.0000').notNull(),
    cpc: numeric('cpc', { precision: 10, scale: 2 }).default('0.00').notNull(),
    purchases: integer('purchases').default(0).notNull(),
    purchaseValue: numeric('purchase_value', { precision: 14, scale: 2 }).default('0.00').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('uq_meta_insight_date_campaign').on(table.date, table.campaignId)
  ]
);

// 4. Sumário Diário Consolidado (Rollup Analítico)
export const dailyAnalyticsSummary = pgTable('daily_analytics_summary', {
  date: date('date').primaryKey(),
  totalRevenue: numeric('total_revenue', { precision: 14, scale: 2 }).default('0.00').notNull(),
  totalOrders: integer('total_orders').default(0).notNull(),
  totalFees: numeric('total_fees', { precision: 14, scale: 2 }).default('0.00').notNull(),
  totalShipping: numeric('total_shipping', { precision: 14, scale: 2 }).default('0.00').notNull(),
  totalSpend: numeric('total_spend', { precision: 14, scale: 2 }).default('0.00').notNull(),
  blendedRoas: numeric('blended_roas', { precision: 10, scale: 2 }).default('0.00').notNull(),
  avgCac: numeric('avg_cac', { precision: 10, scale: 2 }).default('0.00').notNull(),
  netOperatingMargin: numeric('net_operating_margin', { precision: 14, scale: 2 }).default('0.00').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export type IntegrationTokenRow = typeof integrationTokens.$inferSelect;
export type InsertIntegrationToken = typeof integrationTokens.$inferInsert;

export type MeliOrderRow = typeof meliOrders.$inferSelect;
export type InsertMeliOrder = typeof meliOrders.$inferInsert;

export type MetaAdInsightRow = typeof metaAdInsights.$inferSelect;
export type InsertMetaAdInsight = typeof metaAdInsights.$inferInsert;

export type DailyAnalyticsSummaryRow = typeof dailyAnalyticsSummary.$inferSelect;
export type InsertDailyAnalyticsSummary = typeof dailyAnalyticsSummary.$inferInsert;
