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

test('Mensagem de cupons gerais não deve extrair preços de condições nem título falso', async () => {
  const { extrairDadosOferta } = await import('../src/core/sheets.js');
  const { formatarMensagemReplicada } = await import('../src/core/anuncio.js');

  const textoConcorrente = `📣 NOVOS CUPONS MERCADO LIVRE!

🎟️ PROMOL
Desconto: R$ 30
Mínimo: R$ 199

🎟️ BRINCAR
Desconto: 10% (limitado a R$ 100)
Mínimo: R$ 79

👉 https://meli.la/concorrente`;

  const dados = extrairDadosOferta(textoConcorrente);

  // Não pode extrair "NOVOS CUPONS" nem "PROMOL" como título de produto
  assert.notStrictEqual(dados.produto, 'NOVOS CUPONS MERCADO LIVRE!');
  assert.notStrictEqual(dados.produto, 'PROMOL');
  assert.strictEqual(dados.produto, 'Cupons de Desconto Mercado Livre');

  // Não pode extrair R$ 100, R$ 79 ou R$ 30 como preço de produto
  assert.strictEqual(dados.valorPor, '', 'valorPor deve ser vazio para lista de cupons');
  assert.strictEqual(dados.valorDe, '', 'valorDe deve ser vazio para lista de cupons');

  // Na replicação, o link deve ser substituído pela vitrine oficial do usuário
  const linkVitrine = 'https://mercadolivre.com/sec/2rM6RPm';
  const textoHigienizado = textoConcorrente.replace(/https?:\/\/[^\s]+/gi, linkVitrine);
  const formatado = formatarMensagemReplicada({
    tipo: 'cupom',
    titulo: dados.produto,
    linkVitrineCurto: linkVitrine,
    textoOriginalHigienizado: textoHigienizado
  });

  assert.ok(formatado.includes(linkVitrine), 'Deve conter a vitrine oficial do Eduardo');
  assert.ok(!formatado.includes('https://meli.la/concorrente'), 'Não deve conter o link original do concorrente');
  assert.ok(formatado.includes('@pokemon_tcg_promo'), 'Deve conter a assinatura da marca');
});

test('Replica de Cupom Mercado Livre deve replicar a mesma coisa trocando apenas o link para o do usuario', async () => {
  const { extrairCupom, formatarMensagemReplicada } = await import('../src/core/anuncio.js');

  const msgConcorrente = `NOVO CUPOM MERACDO LIVRE

R$ 100 OFF acima de R$799
🎟️ Cupom: 10DO10SITE

🔗 https://meli.la/2j69N6U`;

  const cupom = extrairCupom(msgConcorrente);
  assert.strictEqual(cupom, '10DO10SITE');

  const linkOficialEduardo = 'https://mercadolivre.com/sec/2rM6RPm';
  const textoHigienizado = msgConcorrente
    .replace(/\bmera?cdo\s+livre\b/gi, 'MERCADO LIVRE')
    .replace('https://meli.la/2j69N6U', linkOficialEduardo);

  const formatado = formatarMensagemReplicada({
    tipo: 'cupom',
    titulo: 'NOVO CUPOM MERCADO LIVRE',
    cupom: cupom || undefined,
    linkVitrineCurto: linkOficialEduardo,
    textoOriginalHigienizado: textoHigienizado
  });

  // 1. Deve preservar todas as regras e valores originais
  assert.ok(formatado.includes('R$ 100 OFF acima de R$799'), 'Deve preservar o desconto e valor mínimo original');
  assert.ok(formatado.includes('10DO10SITE'), 'Deve conter o código exato do cupom');

  // 2. Deve conter apenas o link do usuário e remover o do concorrente
  assert.ok(formatado.includes(linkOficialEduardo), 'Deve conter o link de afiliado oficial do Eduardo');
  assert.ok(!formatado.includes('https://meli.la/2j69N6U'), 'Não deve conter o link do concorrente');

  // 3. Cabeçalho de loja corrigido
  assert.ok(formatado.includes('NOVO CUPOM MERCADO LIVRE'));
});


