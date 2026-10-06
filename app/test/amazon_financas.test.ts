import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmazonRelatorioCsv, processarImportacaoAmazon } from '../src/analytics/amazon-financas.service.js';

test('Amazon Finanças - Parser de Relatório Resumido de Ganhos Diários (Português)', () => {
  const csvPt = `Data;Itens enviados;Receita de produto enviada;Receita de comissão
2026-10-01;5;R$ 450,00;R$ 45,00
2026-10-02;8;R$ 820,50;R$ 82,05
2026-10-03;2;R$ 150,00;R$ 15,00`;

  const res = parseAmazonRelatorioCsv(csvPt);
  assert.equal(res.linhasLidas, 3);
  assert.equal(res.totalItens, 15);
  assert.equal(Math.round(res.totalVendas), 1421);
  assert.equal(Math.round(res.totalComissao), 142);

  const dia1 = res.dias.get('2026-10-01');
  assert.ok(dia1);
  assert.equal(dia1.itens, 5);
  assert.equal(dia1.vendas, 450);
  assert.equal(dia1.comissao, 45);
});

test('Amazon Finanças - Parser de Relatório em Inglês com formato US ($ e vírgulas)', () => {
  const csvEn = `Date,Shipped Items,Shipped Items Revenue,Total Commission
10/01/2026,3,"$250.00","$25.00"
10/02/2026,4,"$400.00","$40.00"`;

  const res = parseAmazonRelatorioCsv(csvEn);
  assert.equal(res.linhasLidas, 2);
  assert.equal(res.totalItens, 7);
  assert.equal(res.totalVendas, 650);
  assert.equal(res.totalComissao, 65);

  const dia1 = res.dias.get('2026-10-01');
  assert.ok(dia1);
  assert.equal(dia1.comissao, 25);
});

test('Amazon Finanças - Parser de Relatório Detalhado de Itens com ASIN', () => {
  const csvDetalhado = `Data\tASIN\tTítulo do Produto\tPreço\tItens\tReceita\tComissão
04/10/2026\tB0DFZ49J38\tBox Pokémon TCG Escuridão Absoluta\tR$ 189,90\t2\tR$ 379,80\tR$ 37,98
04/10/2026\tB0C1234567\tBooster Pack Pokémon 151\tR$ 49,90\t4\tR$ 199,60\tR$ 19,96
05/10/2026\tB0DFZ49J38\tBox Pokémon TCG Escuridão Absoluta\tR$ 189,90\t1\tR$ 189,90\tR$ 18,99`;

  const res = parseAmazonRelatorioCsv(csvDetalhado);
  assert.equal(res.linhasLidas, 3);
  assert.equal(res.totalItens, 7);
  assert.equal(Math.round(res.totalVendas), 769);
  assert.equal(Math.round(res.totalComissao), 77);

  // Consolidação diária do dia 04/10 (2 itens diferentes somados)
  const dia4 = res.dias.get('2026-10-04');
  assert.ok(dia4);
  assert.equal(dia4.itens, 6);
  assert.equal(Math.round(dia4.vendas), 579);
  assert.equal(Math.round(dia4.comissao), 58);
});

test('Amazon Finanças - Persistência de Importação de Relatório e Lançamento Rápido no SQLite', async () => {
  const { lancamentoRapidoAmazon, listarRelatoriosAmazon } = await import('../src/analytics/amazon-financas.service.js');
  const { db } = await import('../src/db/database.js');

  const csv = `Data;Itens enviados;Receita de produto enviada;Receita de comissão
2026-10-05;3;R$ 300,00;R$ 30,00`;

  const importRes = processarImportacaoAmazon('relatorio_teste.csv', csv);
  assert.equal(importRes.ok, true);
  assert.equal(importRes.totalItens, 3);
  assert.equal(importRes.totalComissao, 30);

  // Verificar se gravou em financas_lancamentos_diarios
  const row = db.prepare('SELECT * FROM financas_lancamentos_diarios WHERE data_lancamento = ?').get('2026-10-05') as any;
  assert.ok(row);
  assert.equal(row.comissao_amazon, 30);
  assert.equal(row.vendas_amazon, 300);

  // Testar lançamento rápido
  const lancou = lancamentoRapidoAmazon({
    data: '2026-10-06',
    comissao: 55.50,
    vendas: 555.00,
    itens: 4,
    descricao: 'Venda de Pokémon 151 Amazon'
  });
  assert.equal(lancou, true);

  const row2 = db.prepare('SELECT * FROM financas_lancamentos_diarios WHERE data_lancamento = ?').get('2026-10-06') as any;
  assert.ok(row2);
  assert.equal(row2.comissao_amazon, 55.5);
  assert.equal(row2.vendas_amazon, 555);

  const rels = listarRelatoriosAmazon();
  assert.ok(rels.length > 0);
  assert.equal(rels[0].nome_arquivo, 'relatorio_teste.csv');
});
