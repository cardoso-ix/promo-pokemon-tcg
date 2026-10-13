import assert from 'node:assert';
import { test } from 'node:test';
import {
  cleanUrlForMeliApi,
  getCachedMeliShortUrl,
  setCachedMeliShortUrl,
  clearMeliShortUrlCache,
  shortenToMeli
} from '../src/core/affiliate.js';

test('cleanUrlForMeliApi deve remover parâmetros matt_word, matt_tool, forceInApp e tracking_id', () => {
  const dirtyUrl = 'https://www.mercadolivre.com.br/caixa-fechada-pokemon/up/MLBU123?matt_word=caed1312314&matt_tool=96097202&forceInApp=true&tracking_id=xyz&searchVariation=1';
  const cleaned = cleanUrlForMeliApi(dirtyUrl);

  const url = new URL(cleaned);
  assert.strictEqual(url.searchParams.has('matt_word'), false);
  assert.strictEqual(url.searchParams.has('matt_tool'), false);
  assert.strictEqual(url.searchParams.has('forceInApp'), false);
  assert.strictEqual(url.searchParams.has('tracking_id'), false);
  assert.strictEqual(url.searchParams.has('searchVariation'), false);
  assert.strictEqual(url.origin + url.pathname, 'https://www.mercadolivre.com.br/caixa-fechada-pokemon/up/MLBU123');
});

test('Cache em memória de Meli links deve salvar e recuperar link em 0ms', () => {
  clearMeliShortUrlCache();

  const originalUrl = 'https://www.mercadolivre.com.br/p/MLB99999999';
  const tag = 'caed1312314';
  const expectedShort = 'https://meli.la/2Exemplo';

  assert.strictEqual(getCachedMeliShortUrl(originalUrl, tag), null);

  setCachedMeliShortUrl(originalUrl, tag, expectedShort);
  assert.strictEqual(getCachedMeliShortUrl(originalUrl, tag), expectedShort);

  // Também recupera se a URL passada tiver parâmetros de afiliado que foram limpos
  const urlComParametros = `${originalUrl}?matt_word=caed1312314&matt_tool=96097202`;
  assert.strictEqual(getCachedMeliShortUrl(urlComParametros, tag), expectedShort);
});

test('shortenToMeli deve retornar direto do cache sem efetuar fetch externo', async () => {
  clearMeliShortUrlCache();

  const url = 'https://www.mercadolivre.com.br/p/MLB88888888';
  const tag = 'caed1312314';
  const cachedUrl = 'https://meli.la/2CacheFast';

  setCachedMeliShortUrl(url, tag, cachedUrl);

  // Mesmo passando cookie vazio/fictício, o cache responde na hora
  const result = await shortenToMeli(url, 'qualquer_cookie', tag);
  assert.strictEqual(result, cachedUrl);
});
