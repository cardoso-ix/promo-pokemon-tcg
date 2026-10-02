import assert from 'node:assert';
import { test } from 'node:test';
import sharp from 'sharp';
import { padronizarFotoEstudio } from '../src/core/image-studio.js';

test('padronizarFotoEstudio - deve transformar imagem retangular em quadrado 1:1 centralizado com respiro', async () => {
  // Criar uma imagem retangular de teste 400x200 (proporção 2:1)
  const inputRect = await sharp({
    create: {
      width: 400,
      height: 200,
      channels: 3,
      background: { r: 255, g: 0, b: 0 } // vermelho
    }
  })
    .png()
    .toBuffer();

  const padronizada = await padronizarFotoEstudio(inputRect, {
    tamanhoCanvas: 1000,
    paddingPercentual: 10,
    corFundo: '#ffffff'
  });

  assert.ok(Buffer.isBuffer(padronizada));
  assert.ok(padronizada.length > 0);

  // Verificar metadados da imagem resultante
  const metadata = await sharp(padronizada).metadata();
  assert.strictEqual(metadata.width, 1000);
  assert.strictEqual(metadata.height, 1000);
  assert.strictEqual(metadata.format, 'jpeg');
});

test('padronizarFotoEstudio - deve transformar imagem vertical em quadrado 1:1 sem distorção', async () => {
  // Criar uma imagem vertical 300x600 (proporção 1:2)
  const inputVert = await sharp({
    create: {
      width: 300,
      height: 600,
      channels: 3,
      background: { r: 0, g: 128, b: 255 }
    }
  })
    .jpeg()
    .toBuffer();

  const padronizada = await padronizarFotoEstudio(inputVert, {
    tamanhoCanvas: 1080,
    paddingPercentual: 15,
    corFundo: '#ffffff'
  });

  const metadata = await sharp(padronizada).metadata();
  assert.strictEqual(metadata.width, 1080);
  assert.strictEqual(metadata.height, 1080);
});

test('padronizarFotoEstudio - deve retornar buffer original em caso de buffer inválido (fallback resiliente)', async () => {
  const fakeBuffer = Buffer.from('nao-eh-uma-imagem-valida');
  const resultado = await padronizarFotoEstudio(fakeBuffer);

  assert.strictEqual(resultado, fakeBuffer);
});
