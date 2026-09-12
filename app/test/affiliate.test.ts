import assert from 'node:assert';
import { test } from 'node:test';
import {
  buildAffiliateUrl,
  isMercadoLivreUrl,
  cleanSpamLines,
  generateContentHash,
  processMessageText,
  normalizarFotoMl
} from '../src/core/affiliate.js';

test('isMercadoLivreUrl deve reconhecer dominios validos do ML', () => {
  assert.strictEqual(isMercadoLivreUrl('https://produto.mercadolivre.com.br/MLB-123'), true);
  assert.strictEqual(isMercadoLivreUrl('https://meli.la/12345'), true);
  assert.strictEqual(isMercadoLivreUrl('https://www.mercadolivre.com/sec/abc'), true);
  assert.strictEqual(isMercadoLivreUrl('https://amazon.com.br/dp/B08'), false);
  assert.strictEqual(isMercadoLivreUrl('https://google.com'), false);
});

test('buildAffiliateUrl deve injetar matt_word e matt_tool e forceInApp', () => {
  const original = 'https://produto.mercadolivre.com.br/MLB-999-pokemon?tracking_id=old123';
  const converted = buildAffiliateUrl(original, 'caed1312314', '96097202');

  const url = new URL(converted);
  assert.strictEqual(url.searchParams.get('matt_word'), 'caed1312314');
  assert.strictEqual(url.searchParams.get('matt_tool'), '96097202');
  assert.strictEqual(url.searchParams.get('forceInApp'), 'true');
  assert.strictEqual(url.searchParams.has('tracking_id'), false);
});

test('cleanSpamLines deve remover assinaturas de terceiros', () => {
  const original = `PROMOÇÃO POKÉMON TCG
Box Coleção Ultra
Apenas R$ 199,00
@rasgabooster.tcg
Link: https://meli.la/xyz
#rasgaboot`;

  const cleaned = cleanSpamLines(original, ['@rasgabooster.tcg', '#rasgaboot']);
  assert.strictEqual(cleaned.includes('@rasgabooster.tcg'), false);
  assert.strictEqual(cleaned.includes('#rasgaboot'), false);
  assert.strictEqual(cleaned.includes('Box Coleção Ultra'), true);
});

test('processMessageText deve substituir o link no corpo da mensagem', async () => {
  const msg = 'Confira esta oferta: https://www.mercadolivre.com.br/p/MLB12345 imperdível!';
  const result = await processMessageText(msg, 'group1', 'caed1312314', '96097202', '@terceiro');

  assert.strictEqual(result.linksConvertidos, 1);
  assert.strictEqual(result.contemMercadoLivre, true);
  assert.strictEqual(result.novoTexto.includes('matt_word=caed1312314'), true);
  assert.strictEqual(result.novoTexto.includes('matt_tool=96097202'), true);
});

test('normalizarFotoMl deve transformar em 2X e JPG de alta resolucao', () => {
  const webpUrl = 'https://http2.mlstatic.com/D_NQ_NP_721095-MLA111832349660_062026-G.webp';
  const normalized = normalizarFotoMl(webpUrl);
  assert.strictEqual(normalized, 'https://http2.mlstatic.com/D_NQ_NP_2X_721095-MLA111832349660_062026-O.jpg');
});

test('cleanSpamLines deve limpar _@rasgabooster.tcg_ sem deixar __', () => {
  const original = `_Pokémon Deck 60 Cartas Sol E Lua_\n\n❌ ~DE: R$139~\n👉🏼 *POR: R$75*\n\n🔗https://meli.la/2SsUCzP\n \n_@rasgabooster.tcg_`;
  const cleaned = cleanSpamLines(original, ['@rasgabooster.tcg']);
  assert.strictEqual(cleaned.includes('__'), false);
  assert.strictEqual(cleaned.includes('@rasgabooster.tcg'), false);
  assert.strictEqual(cleaned.includes('Pokémon Deck'), true);
});

test('cleanSpamLines deve preservar quebras de linha e espacamentos entre paragrafos', () => {
  const original = `*TRIPLO DE ESCURIDÃO*\ncomprando 4 + usando o cupom\n\n🇧🇷 4x Blister Triplo Pokémon Escuridão Absoluta\n\nPor: R$108 *(27 CADA)* 🔥\n⚠️ *cupom: OFFMELI*\n\n🛒 Link do Produto ⤵️\nhttps://meli.la/2qdxUDm`;
  const cleaned = cleanSpamLines(original, ['@rasgabooster.tcg']);
  assert.strictEqual(cleaned, original);
});

test('buildAffiliateUrl deve usar shortSocialUrl para /social/ e /cupons', () => {
  const shortSocial = 'https://mercadolivre.com/sec/2rM6RPm';
  const socialUrl = 'https://www.mercadolivre.com.br/social/concorrente123?matt_word=concorrente';
  const cupomUrl = 'https://www.mercadolivre.com.br/cupons';

  const convertedSocial = buildAffiliateUrl(socialUrl, 'caed1312314', '96097202', shortSocial);
  assert.strictEqual(convertedSocial, shortSocial);

  const convertedCupom = buildAffiliateUrl(cupomUrl, 'caed1312314', '96097202', shortSocial);
  assert.strictEqual(convertedCupom, shortSocial);
});

test('processMessageText deve converter links de cupom e vitrine para o link curto configurado', async () => {
  const msg = `💛 CUPOM DE 25% OFF NO MERCADO LIVRE\n\n1️⃣ Entre no app do Meli:\nhttps://www.mercadolivre.com.br/social/concorrente123?matt_word=concorrente\n2️⃣ Resgate o cupom`;
  const result = await processMessageText(
    msg,
    'group1',
    'caed1312314',
    '96097202',
    '@terceiro',
    '',
    '',
    'https://mercadolivre.com/sec/2rM6RPm'
  );

  assert.strictEqual(result.linksConvertidos, 1);
  assert.strictEqual(result.contemMercadoLivre, true);
  assert.strictEqual(result.novoTexto.includes('https://mercadolivre.com/sec/2rM6RPm'), true);
  assert.strictEqual(result.novoTexto.includes('concorrente123'), false);
});

test('processMessageText deve tratar link meli.la com ponto e virgula no final e substituir pelo link curto', async () => {
  const msg = `Resgate na área! 25% OFF em entregas Full!\n\nPasso a passo para resgatar:\n1. Entre no app através do link: 🔗 https://meli.la/2XNbgSR;\n2. Cliquem em "Mais"`;
  const result = await processMessageText(
    msg,
    'group1',
    'caed1312314',
    '96097202',
    '@terceiro',
    '',
    '',
    'https://mercadolivre.com/sec/2rM6RPm'
  );

  assert.strictEqual(result.linksConvertidos, 1);
  assert.strictEqual(result.contemMercadoLivre, true);
  assert.strictEqual(result.novoTexto.includes('https://mercadolivre.com/sec/2rM6RPm;'), true);
  assert.strictEqual(result.novoTexto.includes('2XNbgSR'), false);
});


