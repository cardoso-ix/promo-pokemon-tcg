import assert from 'node:assert';
import { test } from 'node:test';
import {
  buildAffiliateUrl,
  isMercadoLivreUrl,
  cleanSpamLines,
  generateContentHash,
  processMessageText,
  normalizarFotoMl,
  pontuarSlug,
  normalizarPalavras,
  expandUrl,
  isImagemValidaProdutoMl
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

test('pontuarSlug deve priorizar o número exato de cartas (ex: 360 vs 480)', () => {
  const palavras = normalizarPalavras('Fichário Álbum 360 Cartas Preto');
  const score360 = pontuarSlug('fichario-album-para-cartas-pokemon--360-cartas-pasta-otug', palavras);
  const score480 = pontuarSlug('fichario-album-para-cartas-pokemon-480-cartas-pasta-preto', palavras);

  assert.strictEqual(score360 > score480, true);
});

test('normalizarFotoMl deve converter D_Q_NP_ e sufixos -T para D_NQ_NP_2X_ e -O.jpg', () => {
  const thumbUrl = 'https://http2.mlstatic.com/D_Q_NP_2X_683557-MLB112586912210_062026-T.webp';
  const normalized = normalizarFotoMl(thumbUrl);
  assert.strictEqual(normalized, 'https://http2.mlstatic.com/D_NQ_NP_2X_683557-MLB112586912210_062026-O.jpg');
});

test('normalizarFotoMl deve remover {sanitized_title} e converter para 2X e JPG', () => {
  const urlComToken = 'https://http2.mlstatic.com/D_Q_NP_679655-MLA116433773373_082026-AB{sanitized_title}.webp';
  const normalizada = normalizarFotoMl(urlComToken);
  assert.strictEqual(normalizada, 'https://http2.mlstatic.com/D_NQ_NP_2X_679655-MLA116433773373_082026-AB.jpg');
});

test('isImagemValidaProdutoMl deve rejeitar banners promocionais (Meli+ -OO) e aceitar fotos com _NP_', () => {
  // Banner de assinatura do Meli+ (R$ 74,90/mês)
  assert.strictEqual(isImagemValidaProdutoMl('https://http2.mlstatic.com/D_NQ_828036-MLA118086665863_092026-OO.webp'), false);
  assert.strictEqual(isImagemValidaProdutoMl('https://http2.mlstatic.com/D_NQ_828036-MLA118086665863_092026-OO.jpg'), false);
  // Logos e navegação
  assert.strictEqual(isImagemValidaProdutoMl('https://http2.mlstatic.com/frontend-assets/ui-navigation/5.21.22/logo.png'), false);
  assert.strictEqual(isImagemValidaProdutoMl('https://http2.mlstatic.com/frontend-assets/ui-navigation/180x180.png'), false);

  // Fotos legítimas de produtos Pokémon TCG
  assert.strictEqual(isImagemValidaProdutoMl('https://http2.mlstatic.com/D_NQ_NP_679655-MLA116433773373_082026-O.webp'), true);
  assert.strictEqual(isImagemValidaProdutoMl('https://http2.mlstatic.com/D_NQ_NP_2X_679655-MLA116433773373_082026-O.jpg'), true);
  assert.strictEqual(isImagemValidaProdutoMl('https://http2.mlstatic.com/D_Q_NP_2X_679655-MLA116433773373_082026-V.webp'), true);
});

test('expandUrl para meli.la/2PTWG6y (Pitch Black) deve extrair a foto real do produto e JAMAIS o banner do Meli+ 828036', async () => {
  const expansion = await expandUrl('https://meli.la/2PTWG6y', 'Jogo De Tabuleiro Pokémon Tcg Mega Evolution Pitch Black');
  assert.strictEqual(expansion.resolvedUrl.includes('pitch-black') || expansion.resolvedUrl.includes('MLB77720188'), true);
  // Deve conter a foto oficial do produto (679655)
  assert.strictEqual(expansion.productImageUrl?.includes('679655'), true);
  // NUNCA deve conter o banner do Meli+ (828036)
  assert.strictEqual(expansion.productImageUrl?.includes('828036'), false);
});



