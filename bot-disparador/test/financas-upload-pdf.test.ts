import test from 'node:test';
import assert from 'node:assert/strict';
import { arquivarPlanilhaSemanal } from '../src/core/financas.js';
import { obterConsolidadoMensalFinancas, getFinancasUploadById, deleteFinancasUpload } from '../src/db/database.js';

test('Finanças - Arquivamento de fatura PDF via arquivarPlanilhaSemanal e consolidação mensal', async () => {
  // Simular um buffer PDF simples
  const pdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 120 >> stream
BT
/F1 12 Tf
72 712 Td
(Meta Platforms Ireland Ltd) Tj
0 -20 Td
(Fatura Data: 2026-09-18) Tj
0 -20 Td
(Total Pago: R$ 380,50 BRL) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000216 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
386
%%EOF`;

  const buffer = Buffer.from(pdfContent, 'utf-8');
  const nomeArquivo = 'Fatura_Meta_Setembro_2026.pdf';

  // 1. Arquivar PDF
  const res = await arquivarPlanilhaSemanal(buffer, nomeArquivo, 'Fatura Semanal Meta 18/09', '2026-09');

  assert.ok(res.uploadId > 0, 'Deve retornar uploadId válido');
  assert.equal(res.resumo.nomeArquivo, nomeArquivo);
  assert.equal(res.resumo.mesReferencia, '2026-09');
  assert.equal(res.resumo.gastoTotal, 380.5);

  // 2. Verificar no banco de dados
  const uploadDb = getFinancasUploadById(res.uploadId);
  assert.ok(uploadDb, 'Registro deve existir no banco');
  assert.equal(uploadDb?.nome_arquivo, nomeArquivo);
  assert.equal(uploadDb?.mes_referencia, '2026-09');
  assert.equal(Number(uploadDb?.valor_total_gasto), 380.5);

  // 3. Verificar consolidação mensal
  const consolidado = obterConsolidadoMensalFinancas('2026-09');
  assert.ok(consolidado.kpis.gastoTotal >= 380.5, 'Consolidado mensal deve refletir o valor da fatura em PDF');

  // 4. Limpeza
  const deleted = deleteFinancasUpload(res.uploadId);
  assert.ok(deleted, 'Deve retornar dados do registro deletado');
});
