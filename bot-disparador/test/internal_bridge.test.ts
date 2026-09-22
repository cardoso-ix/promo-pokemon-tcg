import test from 'node:test';
import assert from 'node:assert';
import {
  salvarOfertaRecebida,
  getOfertasRecebidas,
  marcarOfertaStatus,
  deleteOfertaRecebida,
  getConfig
} from '../src/db/database.js';
import { createServer } from '../src/web/server.js';
import { createSessionToken, buildSessionCookie } from '../src/web/auth.js';

test('Banco de Dados - salvarOfertaRecebida persiste oferta no SQLite do disparador', () => {
  const id = salvarOfertaRecebida({
    titulo: 'Box Charizard ex Premium Collection Pokémon TCG',
    linkAfiliado: 'https://meli.la/charizard-ex',
    linkOriginal: 'https://mercadolivre.com.br/sec/item123',
    precoDe: 350.0,
    precoPor: 249.9,
    desconto: 28,
    cupom: 'POKEMON28',
    parcelamento: '6x sem juros',
    imagemUrl: 'https://http2.mlstatic.com/charizard.jpg',
    mensagemFormatada: '🔥 *OFERTA CHARIZARD*',
    origem: 'replicador-tcg'
  });

  assert.ok(id > 0, 'ID gerado deve ser maior que 0');

  const ofertas = getOfertasRecebidas(10);
  const salva = ofertas.find((o) => o.id === id);

  assert.ok(salva, 'Oferta deve ser encontrada no banco');
  assert.strictEqual(salva.titulo, 'Box Charizard ex Premium Collection Pokémon TCG');
  assert.strictEqual(salva.link_afiliado, 'https://meli.la/charizard-ex');
  assert.strictEqual(salva.preco_por, 249.9);
  assert.strictEqual(salva.desconto, 28);
  assert.strictEqual(salva.status, 'nova');

  // Atualizar status
  marcarOfertaStatus(id, 'usada');
  const ofertasAtualizadas = getOfertasRecebidas(10);
  const atualizada = ofertasAtualizadas.find((o) => o.id === id);
  assert.strictEqual(atualizada.status, 'usada');

  // Excluir
  deleteOfertaRecebida(id);
  const ofertasAposDelete = getOfertasRecebidas(10);
  assert.strictEqual(ofertasAposDelete.some((o) => o.id === id), false);
});

test('Endpoint Interno - POST /api/internal/oferta valida X-Internal-Token e cadastra oferta', async () => {
  const app = await createServer();
  const tokenCorreto = process.env.INTERNAL_API_KEY || getConfig('internal_api_key', 'promo-internal-key-2026');

  // 1. Requisição sem token -> 401
  const resSemToken = await app.inject({
    method: 'POST',
    url: '/api/internal/oferta',
    payload: {
      titulo: 'Oferta Invasora',
      linkAfiliado: 'https://meli.la/invasor'
    }
  });
  assert.strictEqual(resSemToken.statusCode, 401, 'Deve rejeitar sem X-Internal-Token');

  // 2. Requisição com token inválido -> 401
  const resTokenInvalido = await app.inject({
    method: 'POST',
    url: '/api/internal/oferta',
    headers: {
      'x-internal-token': 'token-falso-123'
    },
    payload: {
      titulo: 'Oferta Invasora',
      linkAfiliado: 'https://meli.la/invasor'
    }
  });
  assert.strictEqual(resTokenInvalido.statusCode, 401, 'Deve rejeitar token incorreto');

  // 3. Requisição com token correto -> 200 OK
  const resTokenCorreto = await app.inject({
    method: 'POST',
    url: '/api/internal/oferta',
    headers: {
      'x-internal-token': tokenCorreto
    },
    payload: {
      titulo: 'Elite Trainer Box Pokémon TCG 151',
      linkAfiliado: 'https://meli.la/etb-151',
      precoDe: 400.0,
      precoPor: 299.0,
      desconto: 25
    }
  });

  assert.strictEqual(resTokenCorreto.statusCode, 200, 'Deve aprovar token correto');
  const body = JSON.parse(resTokenCorreto.payload);
  assert.strictEqual(body.ok, true);
  assert.ok(body.id > 0);

  // 4. Consultar via GET /api/ofertas-recebidas com autenticação de admin
  const sessionToken = createSessionToken('eduardo');
  const cookieHeader = buildSessionCookie(sessionToken);

  const resListagem = await app.inject({
    method: 'GET',
    url: '/api/ofertas-recebidas',
    headers: {
      cookie: cookieHeader
    }
  });

  assert.strictEqual(resListagem.statusCode, 200);
  const listagemBody = JSON.parse(resListagem.payload);
  assert.strictEqual(listagemBody.ok, true);
  assert.ok(Array.isArray(listagemBody.ofertas));
  assert.ok(listagemBody.ofertas.some((o: any) => o.id === body.id));

  // Limpar
  deleteOfertaRecebida(body.id);
  await app.close();
});
