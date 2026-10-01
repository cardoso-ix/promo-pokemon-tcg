import assert from 'node:assert';
import { test } from 'node:test';
import {
  obterFotoCupomBuffer,
  FOTO_CUPOM_OFICIAL_URL,
  extrairDadosAnuncio
} from '../src/core/anuncio.js';

test('obterFotoCupomBuffer deve retornar o buffer binário válido da foto oficial de cupom Mercado Livre', () => {
  const buffer = obterFotoCupomBuffer();
  assert.ok(buffer, 'Buffer da foto de cupom não deve ser nulo');
  assert.ok(Buffer.isBuffer(buffer), 'Deve ser uma instância de Buffer');
  assert.ok(buffer.length > 100000, `O buffer deve conter a imagem completa (> 100KB), obtido: ${buffer.length} bytes`);
  // Verifica magic bytes de PNG (0x89 0x50 0x4E 0x47)
  assert.strictEqual(buffer[0], 0x89);
  assert.strictEqual(buffer[1], 0x50);
  assert.strictEqual(buffer[2], 0x4E);
  assert.strictEqual(buffer[3], 0x47);
});

test('extrairDadosAnuncio deve definir FOTO_CUPOM_OFICIAL_URL para anúncios ou links de cupom sem foto específica', async () => {
  const dados = await extrairDadosAnuncio(
    {
      url: 'https://mercadolivre.com/sec/2rM6RPm',
      cupom: 'POKEMON20',
      precoPor: '99,00'
    },
    {
      mattWord: 'caed1312314',
      mattTool: '123',
      meliCookie: '',
      meliTag: 'caed1312314',
      linkVitrineCurto: 'https://mercadolivre.com/sec/2rM6RPm'
    }
  );

  assert.ok(dados.ok);
  assert.strictEqual(dados.cupom, 'POKEMON20');
  assert.strictEqual(dados.imageUrl, FOTO_CUPOM_OFICIAL_URL);
  assert.ok(dados.textoGerado.includes('POKEMON20'));
});
