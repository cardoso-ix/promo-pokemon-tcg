import assert from 'node:assert';
import { test } from 'node:test';
import { formatarMensagemReplicada, gerarCopyPromocional } from '../src/core/anuncio.js';

const AVISO_PADRAO = '⚠️ _Preço e estoque promocional sujeitos a alteração a qualquer momento._';

test('formatarMensagemReplicada - Template 1 (Oferta Regular) deve incluir aviso padrão no rodapé', () => {
  const msg = formatarMensagemReplicada({
    tipo: 'oferta',
    titulo: 'Box Treinador Avançado Escarlate e Violeta',
    precoDe: 'R$ 389,90',
    precoPor: 'R$ 249,90',
    linkAfiliado: 'https://meli.la/abc1234'
  });

  assert.strictEqual(msg.endsWith(AVISO_PADRAO), true, 'Template 1 deve terminar com o aviso padrão');
});

test('formatarMensagemReplicada - Template 2 (Alerta de Urgência) deve incluir aviso padrão no rodapé', () => {
  const msg = formatarMensagemReplicada({
    tipo: 'urgencia',
    titulo: 'Booster Box Pokémon 36 Pacotes Original',
    precoPor: 'R$ 219,00',
    linkAfiliado: 'https://meli.la/urgente123'
  });

  assert.strictEqual(msg.endsWith(AVISO_PADRAO), true, 'Template 2 deve terminar com o aviso padrão');
});

test('formatarMensagemReplicada - Template 3 (Cupom com texto higienizado) deve incluir aviso padrão no rodapé', () => {
  const msg = formatarMensagemReplicada({
    tipo: 'cupom',
    titulo: 'Novos Cupons',
    textoOriginalHigienizado: '🔥 NOVO CUPOM NO APP: 20OFF\nhttps://meli.la/cupom123'
  });

  assert.strictEqual(msg.endsWith(AVISO_PADRAO), true, 'Template 3 com texto deve terminar com o aviso padrão');
});

test('formatarMensagemReplicada - Template 3 (Cupom fallback sem texto) deve incluir aviso padrão no rodapé', () => {
  const msg = formatarMensagemReplicada({
    tipo: 'cupom',
    titulo: 'Cupom Mercado Livre',
    cupom: 'POKEDAY20',
    linkVitrineCurto: 'https://mercadolivre.com/sec/2rM6RPm'
  });

  assert.strictEqual(msg.endsWith(AVISO_PADRAO), true, 'Template 3 fallback deve terminar com o aviso padrão');
});

test('gerarCopyPromocional - Gerador de Anúncios deve incluir aviso padrão no rodapé', () => {
  const copy = gerarCopyPromocional({
    titulo: 'Fichário Pokémon 360 Slots',
    precoDe: '70,90',
    precoPor: '37,57',
    linkAfiliado: 'https://meli.la/1355NNd'
  });

  assert.strictEqual(copy.endsWith(AVISO_PADRAO), true, 'gerarCopyPromocional deve terminar com o aviso padrão');
});
