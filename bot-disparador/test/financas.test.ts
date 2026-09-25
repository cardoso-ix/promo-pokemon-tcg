import assert from 'node:assert';
import { test } from 'node:test';
import * as XLSX from 'xlsx';
import fs from 'node:fs';
import {
  converterNumeroSeguro,
  normalizarDataIso,
  parsePlanilhaMeta,
  arquivarPlanilhaSemanal,
  removerUploadArquivado,
  gerarRelatorioExecutivo,
  exportarRelatorioCsv
} from '../src/core/financas.js';
import {
  listarFinancasUploads,
  getFinancasUploadById,
  obterConsolidadoMensalFinancas
} from '../src/db/database.js';

test('converterNumeroSeguro lida corretamente com formatos variados de moeda e número', () => {
  assert.strictEqual(converterNumeroSeguro('R$ 1.234,56'), 1234.56);
  assert.strictEqual(converterNumeroSeguro('1.234,56 (BRL)'), 1234.56);
  assert.strictEqual(converterNumeroSeguro('10.000'), 10000);
  assert.strictEqual(converterNumeroSeguro('1.250.000'), 1250000);
  assert.strictEqual(converterNumeroSeguro('R$ 45,90'), 45.9);
  assert.strictEqual(converterNumeroSeguro('1,250.75'), 1250.75);
  assert.strictEqual(converterNumeroSeguro('150.50'), 150.5);
  assert.strictEqual(converterNumeroSeguro(350), 350);
  assert.strictEqual(converterNumeroSeguro(''), 0);
  assert.strictEqual(converterNumeroSeguro(null), 0);
});

test('normalizarDataIso converte formatos de data brasileiros e padrão para YYYY-MM-DD', () => {
  assert.strictEqual(normalizarDataIso('2026-02-15'), '2026-02-15');
  assert.strictEqual(normalizarDataIso('15/02/2026'), '2026-02-15');
  assert.strictEqual(normalizarDataIso(new Date('2026-02-15T00:00:00Z')), '2026-02-15');
  assert.strictEqual(normalizarDataIso(''), null);
});

test('parsePlanilhaMeta processa corretamente planilha XLSX sintética do Meta Ads', () => {
  // Criar planilha sintética no formato padrão exportado pelo Meta Ads
  const headers = [
    'Nome da campanha',
    'Veiculação',
    'Orçamento',
    'Valor usado (BRL)',
    'Resultados',
    'Custo por resultado',
    'Impressões',
    'Cliques no link',
    'CTR (taxa de cliques no link)',
    'CPC (custo por clique no link)',
    'Início dos relatórios',
    'Término dos relatórios'
  ];

  const row1 = [
    'Campanha Booster Box Pokémon Fev',
    'ativa',
    'R$ 50,00',
    'R$ 350,00',
    '70',
    'R$ 5,00',
    '10.000',
    '300',
    '3.00%',
    'R$ 1,17',
    '2026-02-01',
    '2026-02-07'
  ];

  const row2 = [
    'Campanha Fichários & Sleeves TCG',
    'ativa',
    'R$ 30,00',
    'R$ 150,00',
    '30',
    'R$ 5,00',
    '5.000',
    '150',
    '3.00%',
    'R$ 1,00',
    '2026-02-01',
    '2026-02-07'
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, row1, row2]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const result = parsePlanilhaMeta(buffer, 'meta_ads_semana1.xlsx', 'Semana 1', '2026-02');

  assert.strictEqual(result.resumo.nomeArquivo, 'meta_ads_semana1.xlsx');
  assert.strictEqual(result.resumo.semanaRotulo, 'Semana 1');
  assert.strictEqual(result.resumo.mesReferencia, '2026-02');
  assert.strictEqual(result.resumo.gastoTotal, 500);
  assert.strictEqual(result.resumo.leadsTotal, 100);
  assert.strictEqual(result.resumo.custoPorLeadMedio, 5);
  assert.strictEqual(result.resumo.impressoesTotal, 15000);
  assert.strictEqual(result.resumo.cliquesTotal, 450);
  assert.strictEqual(result.itens.length, 2);
  assert.strictEqual(result.itens[0].nomeCampanha, 'Campanha Booster Box Pokémon Fev');
});

test('Fluxo completo: arquivarPlanilhaSemanal, consolidado mensal, exportar CSV e removerUploadArquivado', async () => {
  const headers = [
    'Nome da campanha',
    'Valor usado (BRL)',
    'Resultados',
    'Impressões',
    'Cliques no link',
    'Início dos relatórios',
    'Término dos relatórios'
  ];

  const row = [
    'Campanha Teste E2E Finanças',
    'R$ 200,00',
    '40',
    '4.000',
    '160',
    '2026-02-10',
    '2026-02-16'
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, row]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Export');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const mesTeste = '2026-02';
  const { uploadId, resumo } = await arquivarPlanilhaSemanal(
    buffer,
    'teste_semana_2.xlsx',
    'Semana 2 Teste',
    mesTeste
  );

  assert.strictEqual(typeof uploadId, 'number');
  assert.strictEqual(resumo.gastoTotal, 200);
  assert.strictEqual(resumo.leadsTotal, 40);

  // 1. Validar registro no SQLite
  const uploadDb = getFinancasUploadById(uploadId);
  assert.ok(uploadDb);
  assert.strictEqual(uploadDb.semana_rotulo, 'Semana 2 Teste');
  assert.ok(fs.existsSync(uploadDb.caminho_arquivo));

  // 2. Validar relatório consolidado mensal
  const relatorio = gerarRelatorioExecutivo(mesTeste);
  assert.strictEqual(relatorio.mesReferencia, mesTeste);
  assert.ok(relatorio.kpis.gastoTotal >= 200);
  assert.ok(relatorio.kpis.leadsTotal >= 40);
  assert.ok(relatorio.semanas.some(s => s.uploadId === uploadId));
  assert.ok(relatorio.topCampanhas.some(c => c.nomeCampanha === 'Campanha Teste E2E Finanças'));

  // 3. Validar exportação de CSV
  const csv = exportarRelatorioCsv(mesTeste);
  assert.ok(csv.includes('RELATÓRIO CONSOLIDADO DE GASTOS COM CAMPANHAS META ADS'));
  assert.ok(csv.includes('Campanha Teste E2E Finanças'));

  // 4. Remover upload arquivado e verificar exclusão física e lógica
  const caminhoArquivo = uploadDb.caminho_arquivo;
  const removido = removerUploadArquivado(uploadId);
  assert.strictEqual(removido, true);

  const uploadApos = getFinancasUploadById(uploadId);
  assert.strictEqual(uploadApos, undefined);
  assert.strictEqual(fs.existsSync(caminhoArquivo), false);
});
