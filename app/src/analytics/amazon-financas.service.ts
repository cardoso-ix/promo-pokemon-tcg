import { db } from '../db/database.js';

export interface AmazonDiaConsolidado {
  data: string; // YYYY-MM-DD
  comissao: number;
  vendas: number;
  itens: number;
}

export interface AmazonParseResult {
  linhasLidas: number;
  totalComissao: number;
  totalVendas: number;
  totalItens: number;
  dias: Map<string, AmazonDiaConsolidado>;
}

export interface AmazonImportResult {
  ok: boolean;
  relatorioId?: number;
  nomeArquivo: string;
  linhasProcessadas: number;
  diasAfetados: number;
  totalComissao: number;
  totalVendas: number;
  totalItens: number;
  periodoInicio?: string;
  periodoFim?: string;
}

/**
 * Normaliza strings de valores monetários da Amazon (R$ 1.234,56 ou $1,234.56)
 */
export function parseMoeda(raw: string | undefined): number {
  if (!raw) return 0;
  let s = String(raw).trim().replace(/[R$\s"']/gi, '');
  if (!s) return 0;

  // Se tem vírgula e ponto (ex: 1.234,56 ou 1,234.56)
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // Padrão brasileiro: 1.234,56 -> 1234.56
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Padrão americano: 1,234.56 -> 1234.56
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    // Apenas vírgula: 45,00 -> 45.00
    s = s.replace(',', '.');
  }

  const num = parseFloat(s);
  return isNaN(num) ? 0 : Number(num.toFixed(2));
}

/**
 * Normaliza datas de relatórios para o formato ISO YYYY-MM-DD
 */
export function parseDataIso(raw: string | undefined, isUsFormat = false): string | null {
  if (!raw) return null;
  const s = String(raw).trim().replace(/["']/g, '');

  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  // Formato DD/MM/YYYY ou MM/DD/YYYY ou DD-MM-YYYY
  const dateMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dateMatch) {
    const num1 = parseInt(dateMatch[1], 10);
    const num2 = parseInt(dateMatch[2], 10);
    const ano = dateMatch[3];

    // Se num1 > 12, com certeza num1 é dia (formato DD/MM/YYYY)
    if (num1 > 12) {
      const dia = String(num1).padStart(2, '0');
      const mes = String(num2).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    }

    // Se num2 > 12, com certeza num2 é dia (formato MM/DD/YYYY)
    if (num2 > 12) {
      const mes = String(num1).padStart(2, '0');
      const dia = String(num2).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    }

    // Caso ambíguo (ambos <= 12): usa a flag de formato (US = MM/DD, BR = DD/MM)
    if (isUsFormat) {
      const mes = String(num1).padStart(2, '0');
      const dia = String(num2).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    } else {
      const dia = String(num1).padStart(2, '0');
      const mes = String(num2).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    }
  }

  // Fallback ISO parcial
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Detecta delimitador CSV (ponto e vírgula, vírgula ou tab)
 */
function detectarDelimitador(linha: string): string {
  const tabs = (linha.match(/\t/g) || []).length;
  const semicolons = (linha.match(/;/g) || []).length;
  const commas = (linha.match(/,/g) || []).length;

  if (tabs > semicolons && tabs > commas) return '\t';
  if (semicolons >= commas) return ';';
  return ',';
}

/**
 * Divide linha de CSV respeitando campos entre aspas
 */
function splitCsvLine(linha: string, delim: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < linha.length; i++) {
    const char = linha[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === delim && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Realiza o parsing de qualquer extrato ou relatório CSV/TSV da Amazon Associates
 */
export function parseAmazonRelatorioCsv(csvContent: string): AmazonParseResult {
  const linhas = String(csvContent || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const dias = new Map<string, AmazonDiaConsolidado>();
  let totalComissao = 0;
  let totalVendas = 0;
  let totalItens = 0;
  let linhasLidas = 0;

  if (linhas.length === 0) {
    return { linhasLidas: 0, totalComissao: 0, totalVendas: 0, totalItens: 0, dias };
  }

  // Localiza cabeçalho (pode haver metadados da Amazon nas primeiras linhas)
  let headerIndex = -1;
  let delimitador = ';';

  for (let i = 0; i < Math.min(10, linhas.length); i++) {
    const lLower = linhas[i].toLowerCase();
    if (
      (lLower.includes('data') || lLower.includes('date')) &&
      (lLower.includes('comiss') || lLower.includes('earn') || lLower.includes('receita') || lLower.includes('revenue') || lLower.includes('asin'))
    ) {
      headerIndex = i;
      delimitador = detectarDelimitador(linhas[i]);
      break;
    }
  }

  // Se não encontrou cabeçalho explícito, tenta primeira linha
  if (headerIndex === -1) {
    headerIndex = 0;
    delimitador = detectarDelimitador(linhas[0]);
  }

  const headerCols = splitCsvLine(linhas[headerIndex], delimitador).map(c =>
    c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  );

  // Detecção de formato de data e moeda US vs BR
  const hasDollar = csvContent.includes('$');
  const hasEnglishHeader = headerCols.some(c => c.includes('date') || c.includes('shipped') || c.includes('commission'));
  const hasPtHeader = headerCols.some(c => c.includes('data') || c.includes('receita') || c.includes('comiss'));
  const isUsFormat = (hasDollar || hasEnglishHeader) && !hasPtHeader;

  let idxData = -1;
  let idxItens = -1;
  let idxReceita = -1;
  let idxComissao = -1;

  // 1. Coluna de Data
  headerCols.forEach((col, idx) => {
    if (idxData === -1 && (col === 'data' || col === 'date' || col.includes('data') || col.includes('date'))) {
      idxData = idx;
    }
  });

  // 2. Coluna de Itens (atende item e itens no plural pt-BR)
  headerCols.forEach((col, idx) => {
    if (idxItens === -1 && (col.includes('item') || col.includes('iten') || col.includes('qtd') || col.includes('quantidade') || col === 'qty')) {
      idxItens = idx;
    }
  });

  // 3. Coluna de Comissão / Ganho
  headerCols.forEach((col, idx) => {
    if (idxComissao === -1 && (col.includes('comiss') || col.includes('earn') || col.includes('fee') || col.includes('ganho'))) {
      idxComissao = idx;
    }
  });

  // 4. Coluna de Receita Total (priorizar receita/faturamento/revenue sobre preço unitário)
  headerCols.forEach((col, idx) => {
    if (idxReceita === -1 && (col.includes('receita') || col.includes('revenue') || col.includes('faturamento') || col.includes('sales'))) {
      idxReceita = idx;
    }
  });

  // Fallback para preço unitário se não encontrou receita de vendas
  if (idxReceita === -1) {
    headerCols.forEach((col, idx) => {
      if (idxReceita === -1 && (col.includes('preco') || col.includes('price'))) {
        idxReceita = idx;
      }
    });
  }

  // Fallbacks de índices posicionais comuns caso o cabeçalho seja atípico
  if (idxData === -1) idxData = 0;
  if (idxItens === -1 && headerCols.length > 1) idxItens = 1;
  if (idxReceita === -1 && headerCols.length > 2) idxReceita = 2;
  if (idxComissao === -1 && headerCols.length > 3) idxComissao = 3;

  for (let i = headerIndex + 1; i < linhas.length; i++) {
    const rawLine = linhas[i];
    // Ignorar linhas de totalizador ou vazias
    if (/^total/i.test(rawLine)) continue;

    const cols = splitCsvLine(rawLine, delimitador);
    if (cols.length < 2) continue;

    const rawData = cols[idxData];
    const dataIso = parseDataIso(rawData, isUsFormat);
    if (!dataIso) continue;

    const itens = idxItens !== -1 ? parseInt(cols[idxItens] || '1', 10) || 1 : 1;
    const receita = idxReceita !== -1 ? parseMoeda(cols[idxReceita]) : 0;
    const comissao = idxComissao !== -1 ? parseMoeda(cols[idxComissao]) : 0;

    linhasLidas++;
    totalComissao += comissao;
    totalVendas += receita;
    totalItens += itens;

    const existente = dias.get(dataIso);
    if (existente) {
      existente.comissao = Number((existente.comissao + comissao).toFixed(2));
      existente.vendas = Number((existente.vendas + receita).toFixed(2));
      existente.itens += itens;
    } else {
      dias.set(dataIso, {
        data: dataIso,
        comissao: Number(comissao.toFixed(2)),
        vendas: Number(receita.toFixed(2)),
        itens
      });
    }
  }

  return {
    linhasLidas,
    totalComissao: Number(totalComissao.toFixed(2)),
    totalVendas: Number(totalVendas.toFixed(2)),
    totalItens,
    dias
  };
}

/**
 * Processa e persiste a importação de um relatório da Amazon no banco SQLite
 */
export function processarImportacaoAmazon(nomeArquivo: string, csvContent: string): AmazonImportResult {
  const parsed = parseAmazonRelatorioCsv(csvContent);

  if (parsed.dias.size === 0) {
    return {
      ok: false,
      nomeArquivo,
      linhasProcessadas: 0,
      diasAfetados: 0,
      totalComissao: 0,
      totalVendas: 0,
      totalItens: 0
    };
  }

  // Garantir colunas comissao_amazon e vendas_amazon na tabela financas_lancamentos_diarios
  try {
    db.prepare('ALTER TABLE financas_lancamentos_diarios ADD COLUMN comissao_amazon REAL DEFAULT 0.0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE financas_lancamentos_diarios ADD COLUMN vendas_amazon REAL DEFAULT 0.0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE financas_lancamentos_diarios ADD COLUMN itens_amazon INTEGER DEFAULT 0').run();
  } catch {}

  // Criar tabela de histórico de relatórios da Amazon
  db.exec(`
    CREATE TABLE IF NOT EXISTS financas_relatorios_amazon (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_arquivo TEXT NOT NULL,
      periodo_inicio TEXT,
      periodo_fim TEXT,
      itens_enviados INTEGER DEFAULT 0,
      receita_gerada REAL DEFAULT 0.0,
      comissoes_geradas REAL DEFAULT 0.0,
      linhas_processadas INTEGER DEFAULT 0,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const datasOrdenadas = Array.from(parsed.dias.keys()).sort();
  const periodoInicio = datasOrdenadas[0];
  const periodoFim = datasOrdenadas[datasOrdenadas.length - 1];

  // Inserir registro do relatório
  const reportInsert = db.prepare(`
    INSERT INTO financas_relatorios_amazon (
      nome_arquivo, periodo_inicio, periodo_fim, itens_enviados, receita_gerada, comissoes_geradas, linhas_processadas
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    nomeArquivo,
    periodoInicio,
    periodoFim,
    parsed.totalItens,
    parsed.totalVendas,
    parsed.totalComissao,
    parsed.linhasLidas
  );

  const relatorioId = Number(reportInsert.lastInsertRowid);

  // Upsert atômico de cada dia consolidado no DRE
  const stmtSelect = db.prepare('SELECT * FROM financas_lancamentos_diarios WHERE data_lancamento = ?');
  const stmtInsertOrUpdate = db.prepare(`
    INSERT INTO financas_lancamentos_diarios (
      data_lancamento, lucro_bruto, vendas_brutas, gasto_campanhas, cliques_meta, impressoes_meta,
      origem, descricao, categoria, comissao_amazon, vendas_amazon, itens_amazon, atualizado_em
    ) VALUES (?, ?, ?, 0.0, 0, 0, 'amazon_report', ?, 'amazon', ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(data_lancamento) DO UPDATE SET
      comissao_amazon = excluded.comissao_amazon,
      vendas_amazon = excluded.vendas_amazon,
      itens_amazon = excluded.itens_amazon,
      lucro_bruto = COALESCE(financas_lancamentos_diarios.lucro_bruto, 0) + excluded.comissao_amazon - COALESCE(financas_lancamentos_diarios.comissao_amazon, 0),
      vendas_brutas = COALESCE(financas_lancamentos_diarios.vendas_brutas, 0) + excluded.vendas_amazon - COALESCE(financas_lancamentos_diarios.vendas_amazon, 0),
      categoria = 'multicanal',
      atualizado_em = CURRENT_TIMESTAMP
  `);

  for (const [dataIso, dia] of parsed.dias.entries()) {
    const rowAtual = stmtSelect.get(dataIso) as any;
    const desc = `Importação Amazon Associates: ${nomeArquivo}`;

    if (!rowAtual) {
      stmtInsertOrUpdate.run(
        dataIso,
        dia.comissao,
        dia.vendas,
        desc,
        dia.comissao,
        dia.vendas,
        dia.itens
      );
    } else {
      stmtInsertOrUpdate.run(
        dataIso,
        dia.comissao,
        dia.vendas,
        desc,
        dia.comissao,
        dia.vendas,
        dia.itens
      );
    }
  }

  return {
    ok: true,
    relatorioId,
    nomeArquivo,
    linhasProcessadas: parsed.linhasLidas,
    diasAfetados: parsed.dias.size,
    totalComissao: parsed.totalComissao,
    totalVendas: parsed.totalVendas,
    totalItens: parsed.totalItens,
    periodoInicio,
    periodoFim
  };
}

/**
 * Lançamento financeiro diário rápido exclusivo da Amazon
 */
export function lancamentoRapidoAmazon(dados: {
  data: string;
  comissao: number;
  vendas?: number;
  itens?: number;
  descricao?: string;
}): boolean {
  const dataIso = dados.data.split('T')[0];
  const comissao = Number(dados.comissao) || 0;
  const vendas = Number(dados.vendas) || (comissao * 10);
  const itens = Number(dados.itens) || 1;
  const desc = dados.descricao || 'Lançamento Manual Amazon Associates';

  try {
    db.prepare('ALTER TABLE financas_lancamentos_diarios ADD COLUMN comissao_amazon REAL DEFAULT 0.0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE financas_lancamentos_diarios ADD COLUMN vendas_amazon REAL DEFAULT 0.0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE financas_lancamentos_diarios ADD COLUMN itens_amazon INTEGER DEFAULT 0').run();
  } catch {}

  const stmt = db.prepare(`
    INSERT INTO financas_lancamentos_diarios (
      data_lancamento, lucro_bruto, vendas_brutas, gasto_campanhas, cliques_meta, impressoes_meta,
      origem, descricao, categoria, comissao_amazon, vendas_amazon, itens_amazon, atualizado_em
    ) VALUES (?, ?, ?, 0.0, 0, 0, 'manual', ?, 'amazon', ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(data_lancamento) DO UPDATE SET
      comissao_amazon = excluded.comissao_amazon,
      vendas_amazon = excluded.vendas_amazon,
      itens_amazon = excluded.itens_amazon,
      lucro_bruto = COALESCE(financas_lancamentos_diarios.lucro_bruto, 0) + excluded.comissao_amazon - COALESCE(financas_lancamentos_diarios.comissao_amazon, 0),
      vendas_brutas = COALESCE(financas_lancamentos_diarios.vendas_brutas, 0) + excluded.vendas_amazon - COALESCE(financas_lancamentos_diarios.vendas_amazon, 0),
      descricao = excluded.descricao,
      categoria = 'multicanal',
      atualizado_em = CURRENT_TIMESTAMP
  `);

  const res = stmt.run(dataIso, comissao, vendas, desc, comissao, vendas, itens);
  return res.changes > 0;
}

/**
 * Lista relatórios importados da Amazon
 */
export function listarRelatoriosAmazon(): any[] {
  try {
    return db.prepare('SELECT * FROM financas_relatorios_amazon ORDER BY id DESC LIMIT 50').all();
  } catch {
    return [];
  }
}
