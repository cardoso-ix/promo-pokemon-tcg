import test from 'node:test';
import assert from 'node:assert';
import { extrairDadosOferta } from '../src/core/sheets.js';
import { calcularDesconto } from '../src/core/anuncio.js';

test('extrairDadosOferta - Não deve truncar R$ 88 para R$ 8 quando seguido de palavras (pix, reais, cada, a vista)', () => {
  const casos = [
    { texto: 'Por: R$ 88 reais', esperadoPor: 'R$ 88' },
    { texto: 'Por: R$ 88 no pix', esperadoPor: 'R$ 88' },
    { texto: 'Por: R$ 88 cada', esperadoPor: 'R$ 88' },
    { texto: 'Por: R$ 88 a vista', esperadoPor: 'R$ 88' },
    { texto: 'Por: R$ 88 no boleto', esperadoPor: 'R$ 88' },
    { texto: 'Por: R$ 88,00 no pix', esperadoPor: 'R$ 88,00' },
    { texto: 'Por: R$ 88,90 no pix', esperadoPor: 'R$ 88,90' },
    { texto: 'Por R$ 88 com cupom', esperadoPor: 'R$ 88' },
    { texto: 'Por apenas 88 reais', esperadoPor: 'R$ 88' },
    { texto: 'Por: R$ 88 🔥', esperadoPor: 'R$ 88' }
  ];

  for (const caso of casos) {
    const res = extrairDadosOferta(caso.texto);
    assert.strictEqual(
      res.valorPor,
      caso.esperadoPor,
      `Falha no caso: "${caso.texto}". Esperado: "${caso.esperadoPor}", obtido: "${res.valorPor}"`
    );
  }
});

test('extrairDadosOferta - Não deve truncar valor De (ex: R$ 120 virando R$ 12)', () => {
  const casos = [
    {
      texto: 'De R$ 120 por R$ 88',
      esperadoDe: 'R$ 120',
      esperadoPor: 'R$ 88'
    },
    {
      texto: 'De R$ 120\nPor R$ 88',
      esperadoDe: 'R$ 120',
      esperadoPor: 'R$ 88'
    },
    {
      texto: 'De R$ 120,00 por R$ 88,00',
      esperadoDe: 'R$ 120,00',
      esperadoPor: 'R$ 88,00'
    }
  ];

  for (const caso of casos) {
    const res = extrairDadosOferta(caso.texto);
    assert.strictEqual(
      res.valorDe,
      caso.esperadoDe,
      `Falha no valor De: "${caso.texto}". Esperado: "${caso.esperadoDe}", obtido: "${res.valorDe}"`
    );
    assert.strictEqual(
      res.valorPor,
      caso.esperadoPor,
      `Falha no valor Por: "${caso.texto}". Esperado: "${caso.esperadoPor}", obtido: "${res.valorPor}"`
    );
  }
});

test('extrairDadosOferta - Não deve extrair parcelas como preço principal', () => {
  const texto = 'Baralho de Batalha Houndoom R$ 88 ou em até 10x de R$ 8,80 sem juros';
  const res = extrairDadosOferta(texto);

  assert.strictEqual(res.valorPor, 'R$ 88');
  assert.notStrictEqual(res.valorPor, 'R$ 8,80');
});

test('extrairDadosOferta - Não deve extrair porcentagem ou parcelamento como preço (ex: 15% ou 10x virando R$ 1)', () => {
  const texto1 = 'Aproveite por 15% de desconto no app';
  const res1 = extrairDadosOferta(texto1);
  assert.strictEqual(res1.valorPor, 'Consultar');

  const texto2 = 'Disponível por 10x sem juros no cartão';
  const res2 = extrairDadosOferta(texto2);
  assert.strictEqual(res2.valorPor, 'Consultar');
});

test('calcularDesconto - Deve calcular desconto com valores inteiros e decimais com ponto ou vírgula', () => {
  // Teste com R$ 120 e R$ 88
  const desc1 = calcularDesconto('120', '88');
  assert.ok(desc1);
  assert.strictEqual(desc1.percentualOff, 27); // (120 - 88) / 120 = 26.66% -> 27%
  assert.strictEqual(desc1.economiaReais, 'R$ 32,00');

  // Teste com ponto decimal (ex: "88.00")
  const desc2 = calcularDesconto('120.00', '88.00');
  assert.ok(desc2);
  assert.strictEqual(desc2.percentualOff, 27);
  assert.strictEqual(desc2.economiaReais, 'R$ 32,00');
});
