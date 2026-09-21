import assert from 'node:assert';
import { test } from 'node:test';
import {
  detectarGatilhoUrgencia,
  detectarMensagemCupom,
  calcularDesconto,
  formatarMensagemReplicada
} from '../src/core/anuncio.js';

test('detectarGatilhoUrgencia identifica termos de escassez e ofertas relâmpago', () => {
  assert.strictEqual(detectarGatilhoUrgencia('🚨 ÚLTIMAS UNIDADES! Corre que vai acabar!'), true);
  assert.strictEqual(detectarGatilhoUrgencia('Oferta muito boa pessoal, menor preço histórico'), true);
  assert.strictEqual(detectarGatilhoUrgencia('Estoque acabando rápido, aproveitem'), true);
  assert.strictEqual(detectarGatilhoUrgencia('Oferta relâmpago no Mercado Livre'), true);
  assert.strictEqual(detectarGatilhoUrgencia('Box Pokémon disponível no link abaixo'), false);
});

test('detectarMensagemCupom identifica postagens focadas em cupons gerais ou vitrine', () => {
  assert.strictEqual(detectarMensagemCupom('🎟️ NOVO CUPOM NO APP! Use 20OFF em compras acima de R$ 150 na lista'), true);
  assert.strictEqual(detectarMensagemCupom('Cupom de R$ 50 liberado para colecionáveis do ML'), true);
  assert.strictEqual(detectarMensagemCupom('Booster Box Pokémon com desconto direto no pix'), false);
});

test('calcularDesconto calcula percentual OFF e economia em reais corretamente', () => {
  const desc1 = calcularDesconto('R$ 389,90', 'R$ 249,90');
  assert.ok(desc1);
  assert.strictEqual(desc1?.percentualOff, 36);
  assert.strictEqual(desc1?.economiaReais, 'R$ 140,00');
  assert.strictEqual(desc1?.tagDesconto.includes('36% OFF'), true);
  assert.strictEqual(desc1?.tagDesconto.includes('Economia de R$ 140,00'), true);

  const desc2 = calcularDesconto('100,00', '50,00');
  assert.ok(desc2);
  assert.strictEqual(desc2?.percentualOff, 50);

  // Se o preço De for menor ou igual ao preço Por, não há desconto válido
  const descInvalido = calcularDesconto('100,00', '120,00');
  assert.strictEqual(descInvalido, null);
});

test('formatarMensagemReplicada - Template 1: Oferta Regular TCG', () => {
  const msg = formatarMensagemReplicada({
    tipo: 'oferta',
    titulo: 'Box Treinador Avançado Escarlate e Violeta Copag',
    precoDe: 'R$ 389,90',
    precoPor: 'R$ 249,90',
    linkAfiliado: 'https://meli.la/abc1234'
  });

  assert.strictEqual(msg.includes('⚡ *OFERTA EXCLUSIVA TCG* ⚡'), true);
  assert.strictEqual(msg.includes('📦 *Box Treinador Avançado Escarlate e Violeta Copag*'), true);
  assert.strictEqual(msg.includes('❌ ~De: R$ 389,90~'), true);
  assert.strictEqual(msg.includes('🔥 *Por apenas: R$ 249,90* (36% OFF · Economia de R$ 140,00)'), true);
  assert.strictEqual(msg.includes('👉 https://meli.la/abc1234'), true);
});

test('formatarMensagemReplicada - Template 2: Alerta de Urgência & Escassez', () => {
  const msg = formatarMensagemReplicada({
    tipo: 'urgencia',
    titulo: 'Booster Box Pokémon 36 Pacotes Original',
    precoDe: 'R$ 320,00',
    precoPor: 'R$ 219,00',
    linkAfiliado: 'https://meli.la/urgente123'
  });

  assert.strictEqual(msg.includes('🚨 *ATENÇÃO: ÚLTIMAS UNIDADES EM ESTOQUE!* 🚨'), true);
  assert.strictEqual(msg.includes('⚡ *Corre antes que acabe o estoque!*'), true);
  assert.strictEqual(msg.includes('👉 https://meli.la/urgente123'), true);
});

test('formatarMensagemReplicada - Template 3: Cupons & Vitrine Oficial', () => {
  const msg = formatarMensagemReplicada({
    tipo: 'cupom',
    titulo: 'Cupom de Desconto Mercado Livre',
    cupom: 'POKEDAY20',
    detalhesCupom: 'R$ 20 OFF acima de R$ 100 em colecionáveis',
    linkVitrineCurto: 'https://mercadolivre.com/sec/2rM6RPm'
  });

  assert.strictEqual(msg.includes('🎟️ *NOVO CUPOM DO MERCADO LIVRE LIBERADO!* 🎟️'), true);
  assert.strictEqual(msg.includes('🏷️ Cupom: *POKEDAY20*'), true);
  assert.strictEqual(msg.includes('R$ 20 OFF acima de R$ 100'), true);
  assert.strictEqual(msg.includes('👉 https://mercadolivre.com/sec/2rM6RPm'), true);
});
