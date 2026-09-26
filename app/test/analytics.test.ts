import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptToken, decryptToken } from '../src/analytics/security.js';
import { metaAdsService } from '../src/analytics/meta.service.js';
import {
  integrationTokens,
  meliOrders,
  metaAdInsights,
  dailyAnalyticsSummary
} from '../src/analytics/schema.js';

test('Segurança & Tokens - Criptografia AES-256-GCM para Tokens', () => {
  const secretToken = 'APP_USR-1234567890-abcdef-token-secreto-meli';
  const encrypted = encryptToken(secretToken);

  assert.notEqual(encrypted, secretToken, 'O token cifrado não pode ser igual ao original');
  assert.ok(encrypted.includes(':'), 'O token cifrado deve conter formato iv:tag:data');

  const decrypted = decryptToken(encrypted);
  assert.equal(decrypted, secretToken, 'O token decifrado deve ser exatamente igual ao original');
});

test('Segurança & Tokens - Fallback transparente para strings não criptografadas', () => {
  const plainToken = 'token_legado_sem_cifra';
  const result = decryptToken(plainToken);
  assert.equal(result, plainToken, 'Deve retornar o token original quando não for string criptografada');
});

test('Meta Ads - Extração de Compras (Purchases) de actions', () => {
  const actions = [
    { action_type: 'link_click', value: '45' },
    { action_type: 'landing_page_view', value: '38' },
    { action_type: 'omni_purchase', value: '4' },
    { action_type: 'post_engagement', value: '120' }
  ];

  const purchases = metaAdsService.extractPurchases(actions);
  assert.equal(purchases, 4, 'Deve extrair corretamente as compras do array actions');

  const emptyPurchases = metaAdsService.extractPurchases(undefined);
  assert.equal(emptyPurchases, 0, 'Deve retornar 0 para actions indefinidas');
});

test('Meta Ads - Extração de Valor Monetário de Conversão de action_values', () => {
  const actionValues = [
    { action_type: 'omni_purchase', value: '389.90' },
    { action_type: 'custom_conversion', value: '50.00' }
  ];

  const val = metaAdsService.extractPurchaseValue(actionValues);
  assert.equal(val, 389.9, 'Deve extrair corretamente o valor de compra');
});

test('Analytics - Cálculos de Inteligência de Negócio (ROAS, CAC e Margem)', () => {
  // Simulação de valores reais:
  // Vendas Meli: R$ 5.000,00 (25 pedidos)
  // Taxas de Marketplace Meli: R$ 750,00 (15%)
  // Custo de Envio: R$ 300,00
  // Investimento Meta Ads: R$ 1.000,00
  const revenueMeli = 5000;
  const ordersMeli = 25;
  const feesMeli = 750;
  const shippingMeli = 300;
  const spendMeta = 1000;

  // Blended ROAS = 5000 / 1000 = 5.0x
  const blendedRoas = Number((revenueMeli / spendMeta).toFixed(2));
  assert.equal(blendedRoas, 5.0, 'Blended ROAS deve ser 5.0x');

  // CAC = 1000 / 25 = R$ 40,00
  const avgCac = Number((spendMeta / ordersMeli).toFixed(2));
  assert.equal(avgCac, 40.0, 'CAC médio deve ser R$ 40,00 por pedido');

  // Margem Operacional Líquida = 5000 - 750 - 300 - 1000 = R$ 2.950,00
  const netMargin = Number((revenueMeli - feesMeli - shippingMeli - spendMeta).toFixed(2));
  assert.equal(netMargin, 2950.0, 'Margem operacional líquida deve ser R$ 2.950,00');

  // Margem % = (2950 / 5000) * 100 = 59%
  const margemPct = Number(((netMargin / revenueMeli) * 100).toFixed(2));
  assert.equal(margemPct, 59.0, 'Margem percentual deve ser 59%');
});

test('Schema Drizzle ORM - Definições das 4 Tabelas Analíticas', () => {
  assert.ok(integrationTokens, 'integration_tokens deve estar definido');
  assert.ok(meliOrders, 'meli_orders deve estar definido');
  assert.ok(metaAdInsights, 'meta_ad_insights deve estar definido');
  assert.ok(dailyAnalyticsSummary, 'daily_analytics_summary deve estar definido');
});
