import assert from 'node:assert';
import { test } from 'node:test';
import {
  detectarGatilhoUrgencia,
  detectarMensagemCupom,
  calcularDesconto,
  formatarMensagemReplicada,
  extrairCupom,
  extrairParcelamento,
  determinarTipoMensagem
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
  assert.strictEqual(detectarMensagemCupom('NOVOS CUPONS NO MERCADO LIVRE\nRegra geral: 15% OFF'), true);
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

  assert.strictEqual(msg.includes('OFERTA EXCLUSIVA TCG'), false);
  assert.strictEqual(msg.includes('Compra 100% Protegida'), false);
  assert.strictEqual(msg.includes('Garanta o seu com desconto'), false);
  assert.strictEqual(msg.startsWith('@pokemon_tcg_promo\n\n📦 *Box Treinador Avançado Escarlate e Violeta Copag*'), true);
  assert.strictEqual(msg.includes('❌ ~De: R$ 389,90~'), true);
  assert.strictEqual(msg.includes('🔥 *Por apenas: R$ 249,90* (36% OFF · Economia de R$ 140,00)'), true);
  assert.strictEqual(msg.includes('🛒 https://meli.la/abc1234'), true);
});

test('formatarMensagemReplicada - Template 2: Alerta de Urgência & Escassez', () => {
  const msg = formatarMensagemReplicada({
    tipo: 'urgencia',
    titulo: 'Booster Box Pokémon 36 Pacotes Original',
    precoDe: 'R$ 320,00',
    precoPor: 'R$ 219,00',
    linkAfiliado: 'https://meli.la/urgente123'
  });

  assert.strictEqual(msg.startsWith('@pokemon_tcg_promo\n\n🚨 *ATENÇÃO: ÚLTIMAS UNIDADES EM ESTOQUE!* 🚨'), true);
  assert.strictEqual(msg.includes('⚡ *Corre antes que acabe o estoque!*'), true);
  assert.strictEqual(msg.includes('🛒 https://meli.la/urgente123'), true);
});

test('formatarMensagemReplicada - Template 3: Cupons & Vitrine Oficial (Fallback sem texto)', () => {
  const msg = formatarMensagemReplicada({
    tipo: 'cupom',
    titulo: 'Cupom de Desconto Mercado Livre',
    cupom: 'POKEDAY20',
    detalhesCupom: 'R$ 20 OFF acima de R$ 100 em colecionáveis',
    linkVitrineCurto: 'https://mercadolivre.com/sec/2rM6RPm'
  });

  assert.strictEqual(msg.startsWith('@pokemon_tcg_promo\n\n🎟️ *NOVO CUPOM DO MERCADO LIVRE LIBERADO!* 🎟️'), true);
  assert.strictEqual(msg.includes('🏷️ Cupom: *POKEDAY20*'), true);
  assert.strictEqual(msg.includes('R$ 20 OFF acima de R$ 100'), true);
  assert.strictEqual(msg.includes('👉 https://mercadolivre.com/sec/2rM6RPm'), true);
});

test('formatarMensagemReplicada - Template 3: Cupons múltiplos replica fielmente o que eles mandaram com marca', () => {
  const textoConcorrente = `NOVOS CUPONS NO MERCADO LIVRE

📌 Regra geral: 15% OFF (compra mínima de R$ 39 e desconto máximo de R$ 40).

https://meli.la/268XAbz

🎟️ MELIMAXITOY
🎟️ MELIATENTU
🎟️ MELIBRASTOY
🎟️ MELIBRINQUEI
🎟️ MELIADORA
🎟️ MELIWHALE
🎟️ MELIGOODMOOD`;

  const msg = formatarMensagemReplicada({
    tipo: 'cupom',
    titulo: 'Novos Cupons no Mercado Livre',
    linkVitrineCurto: 'https://mercadolivre.com/sec/2rM6RPm',
    textoOriginalHigienizado: textoConcorrente
  });

  // Assina @pokemon_tcg_promo no topo
  assert.strictEqual(msg.startsWith('@pokemon_tcg_promo\n\nNOVOS CUPONS NO MERCADO LIVRE'), true);
  // Preserva todas as regras
  assert.strictEqual(msg.includes('Regra geral: 15% OFF'), true);
  // Preserva todos os cupons da lista
  assert.strictEqual(msg.includes('MELIMAXITOY'), true);
  assert.strictEqual(msg.includes('MELIATENTU'), true);
  assert.strictEqual(msg.includes('MELIBRASTOY'), true);
  assert.strictEqual(msg.includes('MELIBRINQUEI'), true);
  assert.strictEqual(msg.includes('MELIADORA'), true);
  assert.strictEqual(msg.includes('MELIWHALE'), true);
  assert.strictEqual(msg.includes('MELIGOODMOOD'), true);
  // Mantém o link fornecido
  assert.strictEqual(msg.includes('https://meli.la/268XAbz'), true);
});

test('extrairCupom extrai código de cupom com precisão e suporta negrito/itálico do WhatsApp', () => {
  assert.strictEqual(extrairCupom('Tripack Pokémon Escuridão Absoluta Cupom: MELIKIDS'), 'MELIKIDS');
  assert.strictEqual(extrairCupom('Preço no app com cupom: *MELIKIDS*'), 'MELIKIDS');
  assert.strictEqual(extrairCupom('Use o cupom MELIKIDS para desconto'), 'MELIKIDS');
  assert.strictEqual(extrairCupom('Aplique o cupom POKEDAY20 no carrinho'), 'POKEDAY20');
  assert.strictEqual(extrairCupom('*CUPOM:* *POKEMON10*'), 'POKEMON10');
  assert.strictEqual(extrairCupom('*CUPOM:* POKEMON10'), 'POKEMON10');
  assert.strictEqual(extrairCupom('🎟️ CUPOM: *DESCONTO15*'), 'DESCONTO15');
  assert.strictEqual(extrairCupom('⚠️ *cupom: OFFMELI*'), 'OFFMELI');
  assert.strictEqual(extrairCupom('Cupom no app: *15OFF*'), '15OFF');
  assert.strictEqual(extrairCupom('Cupom do app: 10OFF'), '10OFF');
  assert.strictEqual(extrairCupom('Cupom exclusivo: *PROMO10*'), 'PROMO10');
  assert.strictEqual(extrairCupom('Cupom ativo: *POKE10*'), 'POKE10');
  assert.strictEqual(extrairCupom('Aplicar cupom *MEGA20*'), 'MEGA20');
  assert.strictEqual(extrairCupom('Cupom de 10% no app: *DEZOFF*'), 'DEZOFF');
  assert.strictEqual(extrairCupom('Cupom de R$ 20: *VINTE*'), 'VINTE');
  assert.strictEqual(extrairCupom('🎟️ *CUPOM DE 10% OFF:* POKEMON10'), 'POKEMON10');
  assert.strictEqual(extrairCupom('Cupom: *10OFF* no carrinho'), '10OFF');
  assert.strictEqual(extrairCupom('Sem cupom nenhum neste post'), null);
});

test('extrairCupom extrai condição descritiva quando não há código alfanumérico explícito', () => {
  const desc1 = extrairCupom('comprando 4 + usando o cupom de 10% no app');
  assert.ok(desc1);
  assert.strictEqual(desc1.includes('10% OFF NO APP'), true);

  const desc2 = extrairCupom('pegue o cupom de R$ 20 no app');
  assert.ok(desc2);
  assert.strictEqual(desc2.includes('R$ 20 NO APP'), true);

  const desc3 = extrairCupom('Box Pokémon com cupom no app');
  assert.ok(desc3);
  assert.strictEqual(desc3.includes('DISPONÍVEL NO APP'), true);

  const desc4 = extrairCupom('Ative o cupom no anúncio para garantir o menor preço');
  assert.ok(desc4);
  assert.strictEqual(desc4.includes('DISPONÍVEL NO ANÚNCIO'), true);
});

test('formatarMensagemReplicada inclui linha de cupom para cupom descritivo e preserva caixa natural', () => {
  const msgDescritiva = formatarMensagemReplicada({
    tipo: 'oferta',
    titulo: 'Box Coleção Pokémon',
    precoDe: 'R$ 250,00',
    precoPor: 'R$ 199,00',
    cupom: '10% OFF NO APP (Ative na página do produto)',
    linkAfiliado: 'https://meli.la/box'
  });

  assert.strictEqual(msgDescritiva.includes('🎟️ Cupom: *10% OFF NO APP (Ative na página do produto)*'), true);
});

test('determinarTipoMensagem prioriza oferta de produto sobre alerta genérico de cupom', () => {
  // Caso que causou o bug no teste do usuário: produto com cupom
  const tipoComProduto = determinarTipoMensagem({
    texto: 'Tripack Pokémon Escuridão Absoluta por R$ 44,90 cupom MELIKIDS',
    hasProdutoEspecifico: true
  });
  assert.strictEqual(tipoComProduto, 'oferta');

  // Alerta de urgência em produto com cupom
  const tipoUrgenciaComProduto = determinarTipoMensagem({
    texto: '🚨 CORRE! Últimas unidades do Tripack com cupom MELIKIDS',
    hasProdutoEspecifico: true
  });
  assert.strictEqual(tipoUrgenciaComProduto, 'urgencia');

  // Apenas cupom geral sem produto específico (direciona para vitrine)
  const tipoApenasCupom = determinarTipoMensagem({
    texto: '🎟️ NOVO CUPOM NO APP DO MERCADO LIVRE! Use MELIKIDS para R$ 15 OFF',
    hasProdutoEspecifico: false
  });
  assert.strictEqual(tipoApenasCupom, 'cupom');
});

test('formatarMensagemReplicada - Oferta de Produto COM Cupom preserva produto e link afiliado', () => {
  const msg = formatarMensagemReplicada({
    tipo: 'oferta',
    titulo: 'Tripack Pokémon Escuridão Absoluta Copag',
    precoDe: 'R$ 59,90',
    precoPor: 'R$ 44,90',
    cupom: 'MELIKIDS',
    linkAfiliado: 'https://meli.la/tripack123'
  });

  assert.strictEqual(msg.startsWith('@pokemon_tcg_promo'), true);
  // NÃO deve conter o cabeçalho genérico de cupom
  assert.strictEqual(msg.includes('NOVO CUPOM DO MERCADO LIVRE LIBERADO'), false);
  // DEVE conter o título do produto
  assert.strictEqual(msg.includes('📦 *Tripack Pokémon Escuridão Absoluta Copag*'), true);
  // DEVE conter os preços
  assert.strictEqual(msg.includes('❌ ~De: R$ 59,90~'), true);
  assert.strictEqual(msg.includes('🔥 *Por apenas: R$ 44,90*'), true);
  // DEVE conter o cupom destacado
  assert.strictEqual(msg.includes('🎟️ Cupom: *MELIKIDS*'), true);
  // DEVE conter o link do produto, e NÃO a vitrine geral
  assert.strictEqual(msg.includes('🛒 https://meli.la/tripack123'), true);
  // NÃO deve conter garantia/envio rápido nem chamada longa
  assert.strictEqual(msg.includes('Compra 100% Protegida'), false);
  assert.strictEqual(msg.includes('Garanta o seu com desconto'), false);
});

test('formatarMensagemReplicada - Oferta sem preço informado omite linhas de preço limpas', () => {
  const msg = formatarMensagemReplicada({
    tipo: 'oferta',
    titulo: 'Tripack Pokémon Escuridão Absoluta Copag',
    precoPor: 'Consultar',
    cupom: 'MELIKIDS',
    linkAfiliado: 'https://meli.la/tripack123'
  });

  assert.strictEqual(msg.startsWith('@pokemon_tcg_promo'), true);
  // NÃO deve imprimir "Por apenas: R$ Consultar"
  assert.strictEqual(msg.includes('Consultar'), false);
  assert.strictEqual(msg.includes('Por apenas'), false);
  assert.strictEqual(msg.includes('📦 *Tripack Pokémon Escuridão Absoluta Copag*'), true);
  assert.strictEqual(msg.includes('🎟️ Cupom: *MELIKIDS*'), true);
  assert.strictEqual(msg.includes('🛒 https://meli.la/tripack123'), true);
  // NÃO deve conter garantia/envio rápido nem chamada longa
  assert.strictEqual(msg.includes('Compra 100% Protegida'), false);
  assert.strictEqual(msg.includes('Garanta o seu com desconto'), false);
});

test('formatarMensagemReplicada - Comunicado de Cupom 15% preserva texto e anexa vitrine sem fingir ser produto', () => {
  const textoConcorrente = `🚨 *CUPOM DE 15% DE DESCONTO!*

Todos os produtos enviados estão com *preços excelentes*! 🔥
Não perca tempo e garanta o seu *antes que esgote!* 🛒 ⚡
@all`;

  const msg = formatarMensagemReplicada({
    tipo: 'cupom',
    titulo: 'CUPOM DE 15% DE DESCONTO!',
    linkVitrineCurto: 'https://mercadolivre.com/sec/2rM6RPm',
    textoOriginalHigienizado: textoConcorrente
  });

  assert.strictEqual(msg.startsWith('@pokemon_tcg_promo\n\n🚨 *CUPOM DE 15% DE DESCONTO!*'), true);
  assert.strictEqual(msg.includes('Todos os produtos enviados estão com *preços excelentes*!'), true);
  assert.strictEqual(msg.includes('Não perca tempo e garanta o seu *antes que esgote!*'), true);
  // Não deve inventar "De: R$ 15" ou "Últimas unidades em estoque"
  assert.strictEqual(msg.includes('De: R$ 15'), false);
  assert.strictEqual(msg.includes('ÚLTIMAS UNIDADES EM ESTOQUE'), false);
  // Deve anexar o link da vitrine ao final
  assert.strictEqual(msg.includes('🛒 https://mercadolivre.com/sec/2rM6RPm'), true);
});

test('extrairParcelamento extrai condições de parcelamento sem juros com precisão', () => {
  assert.strictEqual(extrairParcelamento('(Até 10x s/Juros)'), '💳 Em até 10x sem juros');
  assert.strictEqual(extrairParcelamento('Até 10x s/ juros'), '💳 Em até 10x sem juros');
  assert.strictEqual(extrairParcelamento('10x sem juros'), '💳 Em até 10x sem juros');
  assert.strictEqual(extrairParcelamento('4 vezes sem juros'), '💳 Em até 4x sem juros');
  assert.strictEqual(extrairParcelamento('10 vezes sem juros'), '💳 Em até 10x sem juros');
  assert.strictEqual(extrairParcelamento('10x de R$ 36,22 sem juros'), '💳 Em até 10x de R$ 36,22 sem juros');
  assert.strictEqual(extrairParcelamento('em até 12x s/ juro'), '💳 Em até 12x sem juros');
  assert.strictEqual(extrairParcelamento('Sem parcelamento nenhum neste anúncio'), null);
});

test('formatarMensagemReplicada inclui linha de parcelamento apenas quando presente', () => {
  // Cenário da imagem enviada pelo usuário:
  const msgComParcelamento = formatarMensagemReplicada({
    tipo: 'oferta',
    titulo: 'Mega Evolution Pitch Black Eli',
    precoDe: 'R$ 412,25',
    precoPor: 'R$ 362,25',
    parcelamento: '💳 Em até 10x sem juros',
    cupom: 'MELIKIDS',
    linkAfiliado: 'https://meli.la/2TH29Wq'
  });

  assert.strictEqual(msgComParcelamento.includes('💳 Em até 10x sem juros'), true);
  assert.strictEqual(msgComParcelamento.includes('🎟️ Cupom: *MELIKIDS*'), true);
  assert.strictEqual(msgComParcelamento.includes('🛒 https://meli.la/2TH29Wq'), true);

  // Cenário sem parcelamento:
  const msgSemParcelamento = formatarMensagemReplicada({
    tipo: 'oferta',
    titulo: 'Booster Box Pokémon',
    precoPor: 'R$ 200,00',
    linkAfiliado: 'https://meli.la/booster'
  });

  assert.strictEqual(msgSemParcelamento.includes('💳'), false);
  assert.strictEqual(msgSemParcelamento.includes('sem juros'), false);
});
