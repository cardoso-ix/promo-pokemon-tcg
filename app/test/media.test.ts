import assert from 'node:assert';
import { test } from 'node:test';
import { whatsAppManager } from '../src/whatsapp/client.js';

test('unwrapMessage e extractMediaAndText devem desembrulhar todos os tipos de mensagem do WhatsApp', () => {
  const testCases = [
    {
      name: 'imagem direta',
      msg: { imageMessage: { caption: 'Foto Direta', url: 'https://wa.net/1' } },
      expectedCaption: 'Foto Direta',
      expectedHasImage: true
    },
    {
      name: 'ephemeral',
      msg: { ephemeralMessage: { message: { imageMessage: { caption: 'Foto Ephemeral' } } } },
      expectedCaption: 'Foto Ephemeral',
      expectedHasImage: true
    },
    {
      name: 'viewOnce',
      msg: { viewOnceMessage: { message: { imageMessage: { caption: 'Foto ViewOnce' } } } },
      expectedCaption: 'Foto ViewOnce',
      expectedHasImage: true
    },
    {
      name: 'viewOnceV2',
      msg: { viewOnceMessageV2: { message: { imageMessage: { caption: 'Foto V2' } } } },
      expectedCaption: 'Foto V2',
      expectedHasImage: true
    },
    {
      name: 'viewOnceV2Extension',
      msg: { viewOnceMessageV2Extension: { message: { imageMessage: { caption: 'Foto V2 Ext' } } } },
      expectedCaption: 'Foto V2 Ext',
      expectedHasImage: true
    },
    {
      name: 'deviceSentMessage (enviado pelo proprio celular do usuario)',
      msg: { deviceSentMessage: { message: { imageMessage: { caption: 'Foto do meu celular' } } } },
      expectedCaption: 'Foto do meu celular',
      expectedHasImage: true
    },
    {
      name: 'deviceSentMessage aninhado com ephemeral',
      msg: { deviceSentMessage: { message: { ephemeralMessage: { message: { imageMessage: { caption: 'Foto do meu celular em grupo temporario' } } } } } },
      expectedCaption: 'Foto do meu celular em grupo temporario',
      expectedHasImage: true
    },
    {
      name: 'documento que eh imagem',
      msg: { documentWithCaptionMessage: { message: { documentMessage: { caption: 'Foto doc', mimetype: 'image/jpeg' } } } },
      expectedCaption: 'Foto doc',
      expectedHasImage: true
    },
    {
      name: 'texto simples conversation',
      msg: { conversation: 'Apenas texto' },
      expectedCaption: 'Apenas texto',
      expectedHasImage: false
    },
    {
      name: 'texto simples extendedTextMessage',
      msg: { extendedTextMessage: { text: 'Texto longo com link' } },
      expectedCaption: 'Texto longo com link',
      expectedHasImage: false
    }
  ];

  for (const tc of testCases) {
    const result = whatsAppManager.extractMediaAndText(tc.msg);
    assert.strictEqual(result.hasImage, tc.expectedHasImage, `Falha em hasImage para ${tc.name}`);
    assert.strictEqual(result.rawText, tc.expectedCaption, `Falha em caption para ${tc.name}`);
  }
});
