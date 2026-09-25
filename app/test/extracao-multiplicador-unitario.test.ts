import test from 'node:test';
import assert from 'node:assert';
import { extrairDadosOferta } from '../src/core/sheets.js';
import { formatarMensagemReplicada, extrairPrecoUnitario } from '../src/core/anuncio.js';

test('extrairDadosOferta e formatarMensagemReplicada - Deve ignorar clickbaits e capturar multiplicador 2X e preco unitario', () => {
  const mensagemEntrada = `
🚨 Tá Afim de Gastar Pouco? 👈 ❤️ 🔥
👉2X Escuridão Absoluta Booster Copag 🇧🇷
🛒 LOJA OFICIAL: POKÉMON ✅
❌ DE: R$ 37,88
😱 POR: R$ 23,80
(APENAS 11,90 CADA)
🔗 oferta aqui: https://meli.la/1Wg61Xd
⚠️ Promoção sujeita a alteração a qualquer momento!!!
  `.trim();

  const dados = extrairDadosOferta(mensagemEntrada, 'https://produto.mercadolivre.com.br/MLB-123456');

  // 1. O título JAMAIS pode ser o clickbait 'Tá Afim de Gastar Pouco?'
  assert.strictEqual(dados.produto.includes('Tá Afim de Gastar Pouco'), false);
  
  // 2. O título DEVE conter o produto real com o multiplicador 2X preservado
  assert.ok(
    dados.produto.includes('2X Escuridão Absoluta Booster Copag') ||
    dados.produto.includes('2X') && dados.produto.includes('Escuridão Absoluta'),
    `Esperado título com 2X e nome do produto, recebido: "${dados.produto}"`
  );
  assert.ok(dados.produto.includes('🇧🇷'), 'Deve preservar a bandeira do país');

  // 3. Preços De e Por
  assert.ok(dados.valorDe.includes('37,88') || dados.valorDe.includes('37.88'));
  assert.ok(dados.valorPor.includes('23,80') || dados.valorPor.includes('23.80'));

  // 4. Preço unitário extraído
  const unitario = extrairPrecoUnitario(mensagemEntrada);
  assert.ok(unitario, 'Deve extrair o preço unitário da linha (APENAS 11,90 CADA)');
  assert.ok(unitario.includes('11,90') || unitario.includes('11.90'));

  // 5. Formatação da Mensagem Replicada
  const formatada = formatarMensagemReplicada({
    tipo: 'oferta',
    titulo: dados.produto,
    precoDe: dados.valorDe,
    precoPor: dados.valorPor,
    precoUnitario: unitario,
    linkAfiliado: 'https://meli.la/1Wg61Xd'
  });

  assert.ok(formatada.includes('2X Escuridão Absoluta Booster Copag') || formatada.includes('2X'));
  assert.ok(formatada.includes('37,88'));
  assert.ok(formatada.includes('23,80'));
  assert.ok(formatada.includes('11,90 cada'), 'Deve conter a linha destacando o valor por unidade');
  assert.strictEqual(formatada.includes('Tá Afim de Gastar Pouco'), false);
});
