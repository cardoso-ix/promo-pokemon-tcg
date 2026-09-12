import assert from 'node:assert';
import { test } from 'node:test';
import {
  upsertContato,
  getPastasLeads,
  getContatos,
  getAllContatosParaExportar,
  deletePastaLeads,
  deleteContato
} from '../src/db/database.js';

test('Gerenciamento de Pastas de Leads e Exportação', () => {
  const pastaA = 'Pasta Teste Alpha';
  const pastaB = 'Pasta Teste Beta';

  // 1. Cadastrar contatos na Pasta A
  upsertContato({
    jid: '5511900010001@s.whatsapp.net',
    numero: '5511900010001',
    nome: 'Lead Alpha 1',
    grupo_nome: pastaA,
    origem_tipo: 'importacao'
  });

  upsertContato({
    jid: '5511900010002@s.whatsapp.net',
    numero: '5511900010002',
    nome: 'Lead Alpha 2',
    grupo_nome: pastaA,
    origem_tipo: 'importacao'
  });

  // 2. Cadastrar contato na Pasta B
  upsertContato({
    jid: '5511900020001@s.whatsapp.net',
    numero: '5511900020001',
    nome: 'Lead Beta 1',
    grupo_nome: pastaB,
    origem_tipo: 'extracao'
  });

  // 3. Verificar agrupamento em getPastasLeads()
  const pastas = getPastasLeads();
  const foundA = pastas.find(p => p.nome === pastaA);
  const foundB = pastas.find(p => p.nome === pastaB);

  assert.ok(foundA, 'Pasta A deve existir no agrupamento');
  assert.strictEqual(foundA.total >= 2, true);
  assert.ok(foundB, 'Pasta B deve existir no agrupamento');
  assert.strictEqual(foundB.total >= 1, true);

  // 4. Filtrar contatos pela Pasta A
  const contatosA = getContatos(100, 0, '', pastaA);
  assert.strictEqual(contatosA.contatos.some(c => c.numero === '5511900010001'), true);
  assert.strictEqual(contatosA.contatos.every(c => c.grupo_nome === pastaA), true);

  // 5. Filtrar contatos pela Pasta B
  const contatosB = getContatos(100, 0, '', pastaB);
  assert.strictEqual(contatosB.contatos.some(c => c.numero === '5511900020001'), true);
  assert.strictEqual(contatosB.contatos.every(c => c.grupo_nome === pastaB), true);

  // 6. Exportação filtrada e geral
  const exportA = getAllContatosParaExportar(pastaA);
  assert.strictEqual(exportA.some(c => c.numero === '5511900010001'), true);
  assert.strictEqual(exportA.every(c => c.grupo_nome === pastaA), true);

  const exportAll = getAllContatosParaExportar('');
  assert.strictEqual(exportAll.some(c => c.numero === '5511900010001'), true);
  assert.strictEqual(exportAll.some(c => c.numero === '5511900020001'), true);

  // 7. Exclusão de uma pasta isolada
  const deletedCount = deletePastaLeads(pastaA);
  assert.strictEqual(deletedCount >= 2, true);

  // Pasta A não deve mais ter contatos
  const contatosAposDelete = getContatos(100, 0, '', pastaA);
  assert.strictEqual(contatosAposDelete.total, 0);

  // Pasta B continua intacta
  const contatosBDepois = getContatos(100, 0, '', pastaB);
  assert.strictEqual(contatosBDepois.contatos.some(c => c.numero === '5511900020001'), true);

  // Limpeza de Pasta B
  deletePastaLeads(pastaB);

  // 8. Exclusão de contato individual
  upsertContato({
    jid: '5511900030001@s.whatsapp.net',
    numero: '5511900030001',
    nome: 'Contato Para Excluir',
    grupo_nome: 'Teste Individual'
  });
  const contatosTeste = getContatos(10, 0, '5511900030001');
  assert.strictEqual(contatosTeste.total, 1);
  const targetId = contatosTeste.contatos[0].id!;
  deleteContato(targetId);
  const contatosTesteDepois = getContatos(10, 0, '5511900030001');
  assert.strictEqual(contatosTesteDepois.total, 0);
});
