import assert from 'node:assert';
import { test } from 'node:test';
import { deveBuscarFotoExterna, determinarTipoMensagem, extrairCupom, detectarMensagemCupom } from '../src/core/anuncio.js';

test('deveBuscarFotoExterna - Publicação de novo cupom só digitação (sem imagem original) NÃO deve buscar foto', () => {
  // Cenário do usuário: mensagem de cupom no grupo monitorado sem imagem anexada
  const resultado = deveBuscarFotoExterna({
    messageHasImage: false,
    isCupom: true,
    tipoMensagem: 'cupom'
  });

  assert.strictEqual(resultado, false, 'Não deve buscar foto para cupom recebido apenas como texto/digitação');
});

test('deveBuscarFotoExterna - Publicação de cupom com imagem original anexada no WhatsApp não busca foto externa', () => {
  // Mensagem já veio com foto (print de cupom no WhatsApp)
  const resultado = deveBuscarFotoExterna({
    messageHasImage: true,
    isCupom: true,
    tipoMensagem: 'cupom'
  });

  assert.strictEqual(resultado, false, 'Não deve buscar foto externa se a mensagem já veio com imagem');
});

test('deveBuscarFotoExterna - Oferta de produto específico sem foto no WhatsApp PODE buscar foto oficial no ML', () => {
  // Mensagem de produto específico (ex: Fichário 360 slots) postada sem foto pelo concorrente
  const resultado = deveBuscarFotoExterna({
    messageHasImage: false,
    isCupom: false,
    tipoMensagem: 'oferta'
  });

  assert.strictEqual(resultado, true, 'Deve buscar foto oficial no ML para ofertas de produto específico sem foto');
});

test('deveBuscarFotoExterna - Comunicado sem link não deve buscar foto', () => {
  const resultado = deveBuscarFotoExterna({
    messageHasImage: false,
    isCupom: false,
    tipoMensagem: 'oferta',
    isComunicadoSemLink: true
  });

  assert.strictEqual(resultado, false, 'Comunicado sem link não deve buscar foto');
});

test('Detectar cupom e garantir tipo cupom para a mensagem enviada pelo usuário no áudio', () => {
  const textoMensagem = `🔥 NOVO CUPOM NO MERCADO LIVRE EM PRODUTOS SELECIONADOS

🎟️ 20% OFF acima de R$ 49 limite R$ 50
QUEIMADEESTOQUE24

TREINADORES RESGATEM AQUI: 👇
https://mercadolivre.com/sec/2rM6RPm`;

  const cupom = extrairCupom(textoMensagem);
  assert.strictEqual(cupom, 'QUEIMADEESTOQUE24');

  const isCupom = detectarMensagemCupom(textoMensagem);
  assert.strictEqual(isCupom, true);

  const tipo = determinarTipoMensagem({
    texto: textoMensagem,
    hasProdutoEspecifico: false
  });
  assert.strictEqual(tipo, 'cupom');

  // Valida que para essa mensagem sem imagem anexada, a regra proíbe estritamente puxar imagem
  const deveBuscar = deveBuscarFotoExterna({
    messageHasImage: false,
    isCupom: true,
    tipoMensagem: tipo
  });
  assert.strictEqual(deveBuscar, false);
});
