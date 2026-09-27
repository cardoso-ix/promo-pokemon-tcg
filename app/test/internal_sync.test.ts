import test from 'node:test';
import assert from 'node:assert';
import { notificarDisparadorOferta, OfertaSyncPayload } from '../src/core/internal-sync.js';
import { CONFIG } from '../src/config.js';

test('Ponte Interna - notificarDisparadorOferta retorna false de forma segura e não bloqueante', async () => {
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
  assert.strictEqual(resultado, false, 'Deve retornar false sem bloquear execução');
});

test('Ponte Interna - notificarDisparadorOferta lida com modo desintegrado com resiliencia', async () => {
  const payload: OfertaSyncPayload = {
    titulo: 'Oferta Teste',
    linkAfiliado: 'https://meli.la/offline'
  };

  const resultado = await notificarDisparadorOferta(payload);
  assert.strictEqual(resultado, false, 'Deve retornar false de forma graciosa sem quebrar o replicador');
});
