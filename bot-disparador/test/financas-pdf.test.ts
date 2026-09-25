import { test } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import {
  salvarDespesaPdf,
  listarDespesasPeriodo,
  obterResumoDespesasPeriodo,
  getDespesaPdfById,
  deleteDespesaPdf,
  DATA_DIR
} from '../src/db/database.js';
import {
  extrairDadosPdfFatura,
  arquivarDespesaPdf,
  removerDespesaPdf,
  exportarRelatorioPeriodoCsv
} from '../src/core/financas.js';

test('Finanças PDF - salvarDespesaPdf e listarDespesasPeriodo com filtro de data', () => {
  const d1 = salvarDespesaPdf({
    nomeArquivo: 'fatura_meta_2026_09_10.pdf',
    caminhoArquivo: '/tmp/fatura1.pdf',
    tamanhoBytes: 45000,
    dataDespesa: '2026-09-10',
    valor: 250.50,
    descricao: 'Recibo Meta Ads Campanha Blister',
    contaAnuncio: 'act_123456',
    metodoPagamento: 'Cartão Mastercard'
  });

  const d2 = salvarDespesaPdf({
    nomeArquivo: 'fatura_meta_2026_09_20.pdf',
    caminhoArquivo: '/tmp/fatura2.pdf',
    tamanhoBytes: 52000,
    dataDespesa: '2026-09-20',
    valor: 500.00,
    descricao: 'Recibo Meta Ads Campanha Fichários',
    contaAnuncio: 'act_123456',
    metodoPagamento: 'Boleto'
  });

  assert.ok(d1 > 0);
  assert.ok(d2 > 0);

  // Consulta por intervalo abrangendo ambos
  const todos = listarDespesasPeriodo('2026-09-01', '2026-09-30');
  const ids = todos.map(i => i.id);
  assert.ok(ids.includes(d1));
  assert.ok(ids.includes(d2));

  // Consulta filtrando apenas o primeiro
  const apenasPrimeiro = listarDespesasPeriodo('2026-09-05', '2026-09-15');
  const idsFiltrados = apenasPrimeiro.map(i => i.id);
  assert.ok(idsFiltrados.includes(d1));
  assert.strictEqual(idsFiltrados.includes(d2), false);

  // Resumo consolidado do período
  const resumo = obterResumoDespesasPeriodo('2026-09-01', '2026-09-30');
  assert.ok(resumo.totalGasto >= 750.50);
  assert.ok(resumo.totalFaturas >= 2);
  assert.ok(resumo.maiorDespesa >= 500.00);

  // Limpeza
  deleteDespesaPdf(d1);
  deleteDespesaPdf(d2);
  assert.strictEqual(getDespesaPdfById(d1), null);
});

test('Finanças PDF - extrairDadosPdfFatura e arquivarDespesaPdf', async () => {
  // Criar um PDF sintético mínimo com texto de recibo da Meta
  // Um buffer de texto simulado para testar extração heurística
  const textoSimulado = `
    Meta Platforms Ireland Limited
    Recibo de faturamento
    Data da transação: 15/09/2026
    ID da transação: 9876543210
    Método de pagamento: Mastercard *4421
    Total cobrado: R$ 380,45
    Conta de anúncios: Promo Pokemon TCG (act_998877)
  `;

  // Testar parsing de texto / regex mesmo com buffer mock
  const dados = await extrairDadosPdfFatura(Buffer.from(textoSimulado), 'recibo_teste.pdf');
  assert.strictEqual(dados.dataSugerida, '2026-09-15');
  assert.strictEqual(dados.valorSugerido, 380.45);
  assert.ok(dados.descricaoSugerida.includes('9876543210') || dados.descricaoSugerida.includes('Recibo') || dados.descricaoSugerida.includes('Meta'));

  // Testar arquivamento
  const arquivado = await arquivarDespesaPdf(Buffer.from(textoSimulado), 'recibo_teste.pdf', {
    dataDespesa: dados.dataSugerida,
    valor: dados.valorSugerido,
    descricao: dados.descricaoSugerida
  });

  assert.ok(arquivado.despesaId > 0);
  assert.strictEqual(arquivado.despesa.valor, 380.45);
  assert.strictEqual(arquivado.despesa.data_despesa, '2026-09-15');
  assert.ok(fs.existsSync(arquivado.despesa.caminho_arquivo));

  // Exportar CSV
  const csv = exportarRelatorioPeriodoCsv('2026-09-01', '2026-09-30');
  assert.ok(csv.includes('RELATÓRIO DE DESPESAS'));
  assert.ok(csv.includes('380,45'));

  // Limpar arquivo físico e banco
  removerDespesaPdf(arquivado.despesaId);
  assert.strictEqual(fs.existsSync(arquivado.despesa.caminho_arquivo), false);
  assert.strictEqual(getDespesaPdfById(arquivado.despesaId), null);
});
