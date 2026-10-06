import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAmazonUrl,
  extractAmazonAsin,
  buildAmazonAffiliateUrl,
  isImagemValidaProdutoAmazon,
  normalizarFotoAmazon,
  processMessageText
} from '../src/core/affiliate.js';

test('Amazon Affiliate - Detecção de URLs da Amazon', () => {
  assert.equal(isAmazonUrl('https://www.amazon.com.br/dp/B0DFZ49J38'), true);
  assert.equal(isAmazonUrl('https://amazon.com.br/gp/product/B0DFZ49J38'), true);
  assert.equal(isAmazonUrl('https://amzn.to/3Txxxx'), true);
  assert.equal(isAmazonUrl('https://a.co/d/xxxxxx'), true);
  assert.equal(isAmazonUrl('https://mercadolivre.com.br/p/MLB123'), false);
  assert.equal(isAmazonUrl('https://shopee.com.br/item'), false);
});

test('Amazon Affiliate - Extração de ASIN (Amazon Standard Identification Number)', () => {
  assert.equal(extractAmazonAsin('https://www.amazon.com.br/dp/B0DFZ49J38'), 'B0DFZ49J38');
  assert.equal(extractAmazonAsin('https://www.amazon.com.br/Pokemon-TCG-Booster-Escuridao-Absoluta/dp/B0DFZ49J38?ref_=ast_sto_dp'), 'B0DFZ49J38');
  assert.equal(extractAmazonAsin('https://www.amazon.com.br/gp/product/B0C1234567'), 'B0C1234567');
  assert.equal(extractAmazonAsin('https://www.amazon.com.br/s?k=pokemon'), null);
});

test('Amazon Affiliate - Montagem de URL canônica com a tag do usuário', () => {
  const tag = 'tcgpokepromo-20';
  
  // URL com tag de concorrente e parâmetros sujos
  const urlConcorrente = 'https://www.amazon.com.br/Pokemon-Booster/dp/B0DFZ49J38?tag=concorrente-20&linkCode=as2&ref_=as_li_ss_tl';
  const urlFinal = buildAmazonAffiliateUrl(urlConcorrente, tag);
  
  assert.equal(urlFinal, 'https://www.amazon.com.br/dp/B0DFZ49J38?tag=tcgpokepromo-20');
  
  // URL de busca com tag concorrente
  const urlBusca = 'https://www.amazon.com.br/s?k=pokemon+tcg&tag=concorrente-20&ref=sr_pg_1';
  const urlBuscaFinal = buildAmazonAffiliateUrl(urlBusca, tag);
  assert.ok(urlBuscaFinal.includes('tag=tcgpokepromo-20'));
  assert.ok(!urlBuscaFinal.includes('concorrente-20'));
});

test('Amazon Affiliate - Validação e Normalização de Fotos de Produtos', () => {
  const fotoValida = 'https://m.media-amazon.com/images/I/81x12345L._AC_UL320_.jpg';
  const fotoBanner = 'https://m.media-amazon.com/images/G/32/nav/logo.png';
  
  assert.equal(isImagemValidaProdutoAmazon(fotoValida), true);
  assert.equal(isImagemValidaProdutoAmazon(fotoBanner), false);
  
  const fotoNormalizada = normalizarFotoAmazon(fotoValida);
  assert.equal(fotoNormalizada, 'https://m.media-amazon.com/images/I/81x12345L._AC_SL1500_.jpg');
});

test('Amazon Affiliate - Processamento de Mensagem com Link da Amazon no Replicador', async () => {
  const rawText = `🔥 OFERTA POKÉMON TCG NA AMAZON!
Box Pokémon TCG Escuridão Absoluta
Por apenas R$ 189,90!
Compre aqui: https://www.amazon.com.br/dp/B0DFZ49J38?tag=concorrente-20

Aproveitem antes que acabe!`;

  const res = await processMessageText(
    rawText,
    'grupo1@g.us',
    'caed1312314',
    '96097202',
    '',
    '',
    '',
    '',
    '',
    'tcgpokepromo-20', // amazonTag
    true // replicarAmazon
  );

  assert.equal(res.contemAmazon, true);
  assert.equal(res.linksConvertidos, 1);
  assert.ok(res.novoTexto.includes('https://www.amazon.com.br/dp/B0DFZ49J38?tag=tcgpokepromo-20'));
  assert.ok(!res.novoTexto.includes('concorrente-20'));
});

test('Amazon Affiliate - Normalização de Fotos com Overlays e Crops complexos da Amazon', () => {
  const fotoComCropOverlay = 'https://m.media-amazon.com/images/I/71Dkykaam9L.jpg_BO30,255,255,255_UF750,750_SR1910,1000,0,C_ZJPHNwYW4gZm9yZWdyb3VuZD0iIzBGMTExMSIgZm9udD0iQW1hem9uRW1iZXIgNjYiPjQsNTwvc3Bhbj4=,60,875,420,420,0,0_PIRIOFOURANDHALF-medium-V2,TopLeft,190,885_ZJPHNwYW4gZm9yZWdyb3VuZD0iIzU2NTk1OSIgZm9udD0iQW1hem9uRW1iZXIgNjYiPigxMik8L3NwYW4+,650,875,420,420,0,0_QL100_.jpg';
  
  assert.equal(isImagemValidaProdutoAmazon(fotoComCropOverlay), true);
  const normalizada = normalizarFotoAmazon(fotoComCropOverlay);
  assert.equal(normalizada, 'https://m.media-amazon.com/images/I/71Dkykaam9L._AC_SL1500_.jpg');
});

test('Amazon Affiliate - Extração Completa no Gerador de Anúncios com link da Amazon', async () => {
  const { extrairDadosAnuncio } = await import('../src/core/anuncio.js');

  const resultado = await extrairDadosAnuncio(
    {
      url: 'https://www.amazon.com.br/dp/B0H77XPPH2',
      precoPor: '149,90'
    },
    {
      mattWord: 'tcgpokepromo-20',
      mattTool: '12345678',
      amazonTag: 'tcgpokepromo-20'
    }
  );

  assert.equal(resultado.ok, true);
  assert.ok(resultado.titulo.length > 5, 'Título deve ser extraído e formatado');
  assert.ok(!resultado.titulo.includes('Amazon.com.br'), 'Título não deve conter marca da Amazon no final');
  assert.ok(resultado.linkAfiliado.includes('tag=tcgpokepromo-20'), 'Link deve conter a tag do afiliado');
  assert.ok(resultado.imageUrl !== null, 'Imagem não pode ser nula');
  assert.ok(resultado.imageUrl!.includes('media-amazon.com') || resultado.imageUrl!.includes('mlstatic.com'), 'Imagem deve ser oficial ou fallback TCG');
});
