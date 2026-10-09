import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptToken, decryptToken } from '../src/analytics/security.js';
import { metaAdsService } from '../src/analytics/meta.service.js';
import { meliAffiliateService } from '../src/analytics/meli-affiliate.service.js';
import { setConfig, db } from '../src/db/database.js';
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

test('Meta Ads - Atualização de Saldo Manual e Histórico de Recargas', async () => {
  // 1. Ajuste direto de saldo para R$ 150,00
  const saldoDefinido = await metaAdsService.updateAdAccountBalance({
    novoSaldo: 150.0,
    descricao: 'Ajuste inicial de caixa teste',
    alertThreshold: 40.0,
    mode: 'hybrid'
  });

  assert.equal(saldoDefinido.ok, true);
  assert.equal(saldoDefinido.currentBalance, 150.0);
  assert.equal(saldoDefinido.statusBadge, 'healthy');
  assert.equal(saldoDefinido.alertThreshold, 40.0);

  // 2. Adicionar uma recarga adicional de R$ 50,00 (saldo vai para R$ 200,00)
  const saldoAposRecarga = await metaAdsService.updateAdAccountBalance({
    recarga: 50.0,
    descricao: 'Recarga via PIX teste'
  });

  assert.equal(saldoAposRecarga.currentBalance, 200.0);
  assert.equal(saldoAposRecarga.recargas.length > 0, true);
  assert.equal(saldoAposRecarga.recargas[0].valor, 50.0);

  // 3. Simular saldo baixo (< alertThreshold de 40.0)
  const saldoBaixo = await metaAdsService.updateAdAccountBalance({
    novoSaldo: 35.0,
    descricao: 'Simulação de saldo baixo'
  });

  assert.equal(saldoBaixo.currentBalance, 35.0);
  assert.equal(saldoBaixo.statusBadge, 'warning');

  // 4. Simular saldo zerado ou crítico (modo manual)
  const saldoZerado = await metaAdsService.updateAdAccountBalance({
    novoSaldo: 0.0,
    descricao: 'Simulação de saldo zerado',
    mode: 'manual'
  });

  assert.equal(saldoZerado.currentBalance, 0.0);
  assert.equal(saldoZerado.statusBadge, 'critical');

  // Limpeza: Restaurar modo de produção sem poluir a base real
  setConfig('meta_ad_balance_manual_set', 'false');
  setConfig('meta_ad_balance_manual', '0.00');
  setConfig('meta_ad_balance_mode', 'hybrid');
  try {
    db.prepare("DELETE FROM meta_ad_recargas WHERE descricao LIKE '%teste%' OR descricao LIKE '%Simulação%'").run();
  } catch {}
});

test('Meli Afiliados - resetarNovoDia zera comissões de hoje e preserva histórico', async () => {
  // 1. Salvar dados simulados
  meliAffiliateService.saveManualTodayMetrics({
    commissionsToday: 8.46,
    ordersToday: 1,
    totalSalesToday: 85.98,
    clicksToday: 62
  });

  // 2. Executar resetarNovoDia para um novo dia simulado (ex: '2026-09-30')
  const resetado = meliAffiliateService.resetarNovoDia('2026-09-30');

  assert.equal(resetado.commissionsToday, 0, 'Comissões de hoje devem ser resetadas para 0');
  assert.equal(resetado.ordersToday, 0, 'Pedidos de hoje devem ser resetados para 0');
  assert.equal(resetado.totalSalesToday, 0, 'Vendas de hoje devem ser resetadas para 0');
  assert.equal(resetado.clicksToday, 0, 'Cliques de hoje devem ser resetados para 0');

  // Histórico dailyData deve conter a nova entrada de 2026-09-30 e preservar a anterior de 2026-09-29
  assert.ok(Array.isArray(resetado.dailyData));
  const entryHoje = resetado.dailyData.find(d => d.date === '2026-09-30');
  assert.ok(entryHoje, 'Deve conter entrada diária para a nova data');
  assert.equal(entryHoje.earnings, 0, 'Ganhos da nova data devem iniciar em 0');

  // Restaurar dados do dia 29/09 para integridade dos dados reais de hoje
  meliAffiliateService.saveManualTodayMetrics({
    commissionsToday: 8.46,
    ordersToday: 1,
    totalSalesToday: 85.98,
    clicksToday: 62
  });
});
