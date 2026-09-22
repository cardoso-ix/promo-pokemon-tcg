import test from 'node:test';
import assert from 'node:assert';
import { notificarDisparadorOferta, OfertaSyncPayload } from '../src/core/internal-sync.js';
import { CONFIG } from '../src/config.js';

test('Ponte Interna - notificarDisparadorOferta envia payload com headers e token correto', async () => {
  const originalFetch = globalThis.fetch;
  let chamouFetch = false;
  let headersRecebidos: any = {};
  let bodyRecebido: any = {};

  globalThis.fetch = async (url: any, options: any) => {
    chamouFetch = true;
    headersRecebidos = options?.headers || {};
    bodyRecebido = JSON.parse(options?.body || '{}');
    return new Response(JSON.stringify({ ok: true, id: 123 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    const payload: OfertaSyncPayload = {
      titulo: 'Combo Pokémon TCG Escarlate e Violeta 36 Boosters',
      linkAfiliado: 'https://meli.la/testepoke',
      precoDe: 450.0,
      precoPor: 289.9,
      desconto: 35,
      cupom: 'POKE35',
      parcelamento: '10x sem juros',
      imagemUrl: 'https://http2.mlstatic.com/foto.jpg',
      mensagemFormatada: '🔥 MEGA OFERTA...',
      origem: 'replicador-vip'
    };

    const resultado = await notificarDisparadorOferta(payload);

    assert.strictEqual(resultado, true, 'Deve retornar true em caso de sucesso');
    assert.strictEqual(chamouFetch, true, 'Deve invocar fetch');
    assert.strictEqual(headersRecebidos['X-Internal-Token'], CONFIG.internalApiKey, 'Deve conter X-Internal-Token correto');
    assert.strictEqual(bodyRecebido.titulo, payload.titulo);
    assert.strictEqual(bodyRecebido.linkAfiliado, payload.linkAfiliado);
    assert.strictEqual(bodyRecebido.desconto, 35);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Ponte Interna - notificarDisparadorOferta lida com timeout ou erro de conexão com resiliência', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    throw new Error('ECONNREFUSED: Connection refused at http://bot-disparador:3333');
  };

  try {
    const payload: OfertaSyncPayload = {
      titulo: 'Oferta Offline',
      linkAfiliado: 'https://meli.la/offline'
    };

    // Não deve estourar exceção, apenas retornar false
    const resultado = await notificarDisparadorOferta(payload);
    assert.strictEqual(resultado, false, 'Deve retornar false de forma graciosa sem quebrar o replicador');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
