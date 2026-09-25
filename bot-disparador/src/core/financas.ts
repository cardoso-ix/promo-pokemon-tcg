import * as XLSX from 'xlsx';
import path from 'node:path';
import fs from 'node:fs';
import {
  DATA_DIR,
  salvarFinancasUpload,
  listarFinancasUploads,
  getFinancasUploadById,
  deleteFinancasUpload,
  obterConsolidadoMensalFinancas,
  listarMesesDisponiveisFinancas,
  FinancasUploadInput,
  FinancasItemInput,
  FinancasConsolidadoMensal
} from '../db/database.js';

export interface PlanilhaProcessadaResult {
  resumo: {
    nomeArquivo: string;
    tamanhoBytes: number;
    semanaRotulo: string;
    periodoInicio: string | null;
    periodoFim: string | null;
    mesReferencia: string;
    gastoTotal: number;
    impressoesTotal: number;
    cliquesTotal: number;
    leadsTotal: number;
    ctrMedio: number;
    cpcMedio: number;
    cpmMedio: number;
    custoPorLeadMedio: number;
    qtdCampanhas: number;
  };
  itens: FinancasItemInput[];
}

/**
 * Remove acentos, pontuação e converte para minúsculas para correspondência flexível de cabeçalhos
 */
function normalizarTexto(txt: string): string {
  return (txt || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
}

/**
 * Converte strings de moeda/números (com suporte a R$, vírgula brasileira ou ponto decimal) para float seguro
 */
export function converterNumeroSeguro(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = val.toString().trim();
  // Remove símbolos monetários e sufixos como /dia, diário
  str = str.replace(/R\$\s*/gi, '').replace(/\s*\(BRL\)/gi, '').replace(/%/g, '').trim();

  // Caso formato brasileiro: 1.234,56 ou 45,50
  if (/\d+\.\d{3},\d+/.test(str) || (str.includes(',') && !str.includes('.'))) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',') && str.includes('.')) {
    // Caso 1,234.56
    str = str.replace(/,/g, '');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    // Caso de milhar brasileiro sem decimais: 10.000, 125.400, 1.000.000
    str = str.replace(/\./g, '');
  }

  // Remove caracteres residuais exceto dígitos, ponto e sinal de menos
  str = str.replace(/[^\d.-]/g, '');

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Converte data de formatos comuns do Excel ou Meta (YYYY-MM-DD, DD/MM/YYYY, etc.) para YYYY-MM-DD
 */
export function normalizarDataIso(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().split('T')[0];
  }

  const str = val.toString().trim();
  // Formato ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Formato BR: DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const dia = brMatch[1].padStart(2, '0');
    const mes = brMatch[2].padStart(2, '0');
    const ano = brMatch[3];
    return `${ano}-${mes}-${dia}`;
  }

  // Formato US: MM/DD/YYYY
  const usMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (usMatch) {
    const p1 = usMatch[1].padStart(2, '0');
    const p2 = usMatch[2].padStart(2, '0');
    const ano = usMatch[3];
    return `${ano}-${p1}-${p2}`;
  }

  return null;
}

/**
 * Faz o parsing inteligente da planilha do Meta Ads (XLSX, XLS ou CSV)
 */
export function parsePlanilhaMeta(
  buffer: Buffer,
  nomeArquivoOriginal: string,
  semanaRotuloManual?: string,
  mesReferenciaManual?: string
): PlanilhaProcessadaResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('A planilha enviada não contém nenhuma aba válida.');
  }

  // Busca a primeira aba com dados
  let sheet: XLSX.WorkSheet | null = null;
  for (const name of workbook.SheetNames) {
    const s = workbook.Sheets[name];
    if (s && s['!ref']) {
      sheet = s;
      break;
    }
  }

  if (!sheet) {
    throw new Error('Não foi possível ler os dados das células da planilha.');
  }

  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) {
    throw new Error('A planilha está vazia ou contém apenas o cabeçalho.');
  }

  // 1. Identificar a linha do cabeçalho
  let headerIndex = -1;
  let colIndices: Record<string, number> = {};

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    const rowTexts = row.map((cell) => normalizarTexto(cell));
    const temCampanha = rowTexts.some((t) => t.includes('campanha') || t.includes('campaign'));
    const temValor = rowTexts.some((t) => t.includes('valor') || t.includes('gasto') || t.includes('spent') || t.includes('orcamento') || t.includes('budget'));

    if (temCampanha || (temValor && rowTexts.some((t) => t.includes('resultado') || t.includes('impresso')))) {
      headerIndex = r;
      // Mapear cada coluna encontrada
      rowTexts.forEach((colName, idx) => {
        if (!colName) return;

        if (colName.includes('campanha') || colName.includes('campaign') || colName === 'nome') {
          if (colIndices.campanha === undefined) colIndices.campanha = idx;
        } else if (colName.includes('status') || colName.includes('veiculacao') || colName.includes('delivery')) {
          if (colIndices.status === undefined) colIndices.status = idx;
        } else if (colName.includes('orcamento') || colName.includes('budget')) {
          if (colIndices.orcamento === undefined) colIndices.orcamento = idx;
        } else if (
          colName.includes('valor usado') ||
          colName.includes('valor gasto') ||
          colName.includes('amount spent') ||
          (colName.includes('gasto') && !colName.includes('orcamento')) ||
          colName === 'custo'
        ) {
          if (colIndices.valorGasto === undefined) colIndices.valorGasto = idx;
        } else if (colName.includes('resultado') || colName.includes('results') || colName.includes('leads') || colName.includes('cadastros') || colName.includes('conversoes')) {
          if (colIndices.leads === undefined) colIndices.leads = idx;
        } else if (colName.includes('custo por resultado') || colName.includes('cost per result') || colName.includes('custo por lead') || colName === 'cpl') {
          if (colIndices.custoPorLead === undefined) colIndices.custoPorLead = idx;
        } else if (colName.includes('impressoes') || colName.includes('impressions')) {
          if (colIndices.impressoes === undefined) colIndices.impressoes = idx;
        } else if (colName.includes('cliques') || colName.includes('clicks')) {
          if (colIndices.cliques === undefined) colIndices.cliques = idx;
        } else if (colName === 'ctr' || colName.includes('taxa de cliques')) {
          if (colIndices.ctr === undefined) colIndices.ctr = idx;
        } else if (colName === 'cpc' || colName.includes('custo por clique')) {
          if (colIndices.cpc === undefined) colIndices.cpc = idx;
        } else if (colName === 'cpm' || colName.includes('custo por 1000')) {
          if (colIndices.cpm === undefined) colIndices.cpm = idx;
        } else if (colName.includes('inicio') || colName.includes('starts')) {
          if (colIndices.inicio === undefined) colIndices.inicio = idx;
        } else if (colName.includes('termino') || colName.includes('fim') || colName.includes('ends')) {
          if (colIndices.fim === undefined) colIndices.fim = idx;
        }
      });
      break;
    }
  }

  if (headerIndex === -1 || colIndices.valorGasto === undefined) {
    // Fallback: se não encontrou cabeçalho padrão, tenta linha 0 com busca heurística
    headerIndex = 0;
    const headerRow = rows[0].map((c) => normalizarTexto(c));
    headerRow.forEach((colName, idx) => {
      if (colName.includes('campanha') || colName.includes('campaign') || idx === 0) {
        if (colIndices.campanha === undefined) colIndices.campanha = idx;
      }
      if (colName.includes('valor') || colName.includes('gasto') || colName.includes('spent') || colName.includes('custo')) {
        if (colIndices.valorGasto === undefined) colIndices.valorGasto = idx;
      }
      if (colName.includes('resultado') || colName.includes('lead')) {
        if (colIndices.leads === undefined) colIndices.leads = idx;
      }
    });
  }

  const itens: FinancasItemInput[] = [];
  const datasEncontradas: string[] = [];
  let gastoAcumulado = 0;
  let impressoesAcumuladas = 0;
  let cliquesAcumulados = 0;
  let leadsAcumulados = 0;

  // 2. Iterar sobre as linhas de dados
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const nomeRaw = colIndices.campanha !== undefined ? String(row[colIndices.campanha] || '').trim() : '';
    const nomeNorm = normalizarTexto(nomeRaw);

    // Ignora linhas de total geral da Meta (ex: "Total de resultados", "Resultados de 5 campanhas")
    if (
      !nomeRaw ||
      nomeNorm.startsWith('total') ||
      nomeNorm.includes('resultados de') ||
      nomeNorm.includes('resumo de')
    ) {
      continue;
    }

    const valorGasto = colIndices.valorGasto !== undefined ? converterNumeroSeguro(row[colIndices.valorGasto]) : 0;
    const orcamento = colIndices.orcamento !== undefined ? converterNumeroSeguro(row[colIndices.orcamento]) : 0;
    const impressoes = colIndices.impressoes !== undefined ? Math.round(converterNumeroSeguro(row[colIndices.impressoes])) : 0;
    const cliques = colIndices.cliques !== undefined ? Math.round(converterNumeroSeguro(row[colIndices.cliques])) : 0;
    const leads = colIndices.leads !== undefined ? Math.round(converterNumeroSeguro(row[colIndices.leads])) : 0;

    let ctr = colIndices.ctr !== undefined ? converterNumeroSeguro(row[colIndices.ctr]) : 0;
    if (!ctr && impressoes > 0 && cliques > 0) {
      ctr = Number(((cliques / impressoes) * 100).toFixed(2));
    }

    let cpc = colIndices.cpc !== undefined ? converterNumeroSeguro(row[colIndices.cpc]) : 0;
    if (!cpc && cliques > 0 && valorGasto > 0) {
      cpc = Number((valorGasto / cliques).toFixed(2));
    }

    let cpm = colIndices.cpm !== undefined ? converterNumeroSeguro(row[colIndices.cpm]) : 0;
    if (!cpm && impressoes > 0 && valorGasto > 0) {
      cpm = Number(((valorGasto / impressoes) * 1000).toFixed(2));
    }

    let custoPorLead = colIndices.custoPorLead !== undefined ? converterNumeroSeguro(row[colIndices.custoPorLead]) : 0;
    if (!custoPorLead && leads > 0 && valorGasto > 0) {
      custoPorLead = Number((valorGasto / leads).toFixed(2));
    }

    const dataInicio = colIndices.inicio !== undefined ? normalizarDataIso(row[colIndices.inicio]) : null;
    const dataFim = colIndices.fim !== undefined ? normalizarDataIso(row[colIndices.fim]) : null;

    if (dataInicio) datasEncontradas.push(dataInicio);
    if (dataFim) datasEncontradas.push(dataFim);

    const statusVeiculacao = colIndices.status !== undefined ? String(row[colIndices.status] || 'ativa').trim() : 'ativa';

    gastoAcumulado += valorGasto;
    impressoesAcumuladas += impressoes;
    cliquesAcumulados += cliques;
    leadsAcumulados += leads;

    itens.push({
      nomeCampanha: nomeRaw,
      statusVeiculacao,
      orcamento,
      valorGasto,
      impressoes,
      cliques,
      ctr,
      cpc,
      cpm,
      leads,
      custoPorLead,
      dataInicio,
      dataFim,
      mesReferencia: mesReferenciaManual || '' // será preenchido abaixo
    });
  }

  if (itens.length === 0) {
    throw new Error('Nenhuma campanha com dados válidos foi encontrada na planilha enviada.');
  }

  // 3. Determinar Período e Mês de Referência
  datasEncontradas.sort();
  const periodoInicio = datasEncontradas.length > 0 ? datasEncontradas[0] : null;
  const periodoFim = datasEncontradas.length > 0 ? datasEncontradas[datasEncontradas.length - 1] : null;

  let mesReferenciaFinal = (mesReferenciaManual || '').trim();
  if (!mesReferenciaFinal || !/^\d{4}-\d{2}$/.test(mesReferenciaFinal)) {
    if (periodoInicio) {
      mesReferenciaFinal = periodoInicio.substring(0, 7); // YYYY-MM
    } else {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      mesReferenciaFinal = `${ano}-${mes}`;
    }
  }

  // Atualizar mês de referência nos itens
  itens.forEach((it) => {
    it.mesReferencia = mesReferenciaFinal;
  });

  // 4. Determinar Rótulo da Semana
  let semanaRotuloFinal = (semanaRotuloManual || '').trim();
  if (!semanaRotuloFinal) {
    if (periodoInicio && periodoFim) {
      const [, m1, d1] = periodoInicio.split('-');
      const [, m2, d2] = periodoFim.split('-');
      semanaRotuloFinal = `Semana ${d1}/${m1} a ${d2}/${m2}`;
    } else {
      const dataHoje = new Date().toLocaleDateString('pt-BR');
      semanaRotuloFinal = `Semana ${dataHoje}`;
    }
  }

  const ctrMedio = impressoesAcumuladas > 0 ? Number(((cliquesAcumulados / impressoesAcumuladas) * 100).toFixed(2)) : 0;
  const cpcMedio = cliquesAcumulados > 0 ? Number((gastoAcumulado / cliquesAcumulados).toFixed(2)) : 0;
  const cpmMedio = impressoesAcumuladas > 0 ? Number(((gastoAcumulado / impressoesAcumuladas) * 1000).toFixed(2)) : 0;
  const custoPorLeadMedio = leadsAcumulados > 0 ? Number((gastoAcumulado / leadsAcumulados).toFixed(2)) : 0;

  return {
    resumo: {
      nomeArquivo: nomeArquivoOriginal,
      tamanhoBytes: buffer.length,
      semanaRotulo: semanaRotuloFinal,
      periodoInicio,
      periodoFim,
      mesReferencia: mesReferenciaFinal,
      gastoTotal: Number(gastoAcumulado.toFixed(2)),
      impressoesTotal: impressoesAcumuladas,
      cliquesTotal: cliquesAcumulados,
      leadsTotal: leadsAcumulados,
      ctrMedio,
      cpcMedio,
      cpmMedio,
      custoPorLeadMedio,
      qtdCampanhas: itens.length
    },
    itens
  };
}

/**
 * Salva fisicamente o arquivo em /app/data/financas_uploads/ e grava registros no SQLite
 */
export async function arquivarPlanilhaSemanal(
  buffer: Buffer,
  nomeArquivoOriginal: string,
  semanaRotulo?: string,
  mesReferencia?: string
): Promise<{ uploadId: number; resumo: any }> {
  const parsed = parsePlanilhaMeta(buffer, nomeArquivoOriginal, semanaRotulo, mesReferencia);

  const uploadsDir = path.join(DATA_DIR, 'financas_uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Nome único seguro para o arquivo arquivado
  const timestamp = Date.now();
  const safeBase = path.basename(nomeArquivoOriginal).replace(/[^a-zA-Z0-9._-]/g, '_');
  const nomeSalvo = `${timestamp}_${safeBase}`;
  const caminhoCompleto = path.join(uploadsDir, nomeSalvo);

  fs.writeFileSync(caminhoCompleto, buffer);

  const uploadInput: FinancasUploadInput = {
    nomeArquivo: nomeArquivoOriginal,
    caminhoArquivo: caminhoCompleto,
    tamanhoBytes: buffer.length,
    semanaRotulo: parsed.resumo.semanaRotulo,
    periodoInicio: parsed.resumo.periodoInicio,
    periodoFim: parsed.resumo.periodoFim,
    mesReferencia: parsed.resumo.mesReferencia,
    gastoTotal: parsed.resumo.gastoTotal,
    impressoesTotal: parsed.resumo.impressoesTotal,
    cliquesTotal: parsed.resumo.cliquesTotal,
    leadsTotal: parsed.resumo.leadsTotal,
    ctrMedio: parsed.resumo.ctrMedio,
    cpcMedio: parsed.resumo.cpcMedio,
    cpmMedio: parsed.resumo.cpmMedio,
    custoPorLeadMedio: parsed.resumo.custoPorLeadMedio,
    qtdCampanhas: parsed.resumo.qtdCampanhas
  };

  const uploadId = salvarFinancasUpload(uploadInput, parsed.itens);

  return {
    uploadId,
    resumo: {
      ...parsed.resumo,
      uploadId
    }
  };
}

/**
 * Remove o arquivo físico e os registros do banco de dados
 */
export function removerUploadArquivado(id: number): boolean {
  const res = deleteFinancasUpload(id);
  if (res && res.caminhoArquivo && fs.existsSync(res.caminhoArquivo)) {
    try {
      fs.unlinkSync(res.caminhoArquivo);
    } catch (err) {
      console.warn(`[Finanças] Aviso ao remover arquivo físico ${res.caminhoArquivo}:`, err);
    }
  }
  return true;
}

/**
 * Gera relatório executivo mensal consolidando métricas, histórico e top campanhas
 */
export function gerarRelatorioExecutivo(mesReferencia: string): FinancasConsolidadoMensal {
  return obterConsolidadoMensalFinancas(mesReferencia);
}

/**
 * Exporta o relatório mensal consolidado em formato CSV limpo para download
 */
export function exportarRelatorioCsv(mesReferencia: string): string {
  const rel = obterConsolidadoMensalFinancas(mesReferencia);

  const linhas: string[] = [];
  linhas.push(`RELATÓRIO CONSOLIDADO DE GASTOS COM CAMPANHAS META ADS - MÊS ${mesReferencia}`);
  linhas.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
  linhas.push('');

  linhas.push('--- RESUMO EXECUTIVO ---');
  linhas.push(`Gasto Total no Mês;R$ ${rel.kpis.gastoTotal.toFixed(2).replace('.', ',')}`);
  linhas.push(`Total de Leads / Resultados;${rel.kpis.leadsTotal}`);
  linhas.push(`Custo Médio por Lead (CPL);R$ ${rel.kpis.custoPorLeadMedio.toFixed(2).replace('.', ',')}`);
  linhas.push(`Total de Impressões;${rel.kpis.impressoesTotal}`);
  linhas.push(`Total de Cliques;${rel.kpis.cliquesTotal}`);
  linhas.push(`CTR Médio;${rel.kpis.ctrMedio.toFixed(2).replace('.', ',')}%`);
  linhas.push(`CPC Médio;R$ ${rel.kpis.cpcMedio.toFixed(2).replace('.', ',')}`);
  linhas.push(`CPM Médio;R$ ${rel.kpis.cpmMedio.toFixed(2).replace('.', ',')}`);
  linhas.push(`Total de Semanas Arquivadas;${rel.kpis.qtdUploads}`);
  linhas.push('');

  linhas.push('--- EVOLUÇÃO SEMANAL ---');
  linhas.push('Semana / Arquivo;Período;Gasto (R$);Leads;CPL (R$);Cliques;Impressões;CTR (%)');
  rel.semanas.forEach((sem) => {
    linhas.push(
      `"${sem.semanaRotulo}";"${sem.periodoInicio || ''} a ${sem.periodoFim || ''}";${sem.gastoTotal.toFixed(2).replace('.', ',')};${sem.leadsTotal};${sem.custoPorLeadMedio.toFixed(2).replace('.', ',')};${sem.cliquesTotal};${sem.impressoesTotal};${sem.ctrMedio.toFixed(2).replace('.', ',')}%`
    );
  });
  linhas.push('');

  linhas.push('--- PERFORMANCE POR CAMPANHA ---');
  linhas.push('Campanha;Gasto Acumulado (R$);Leads;CPL Médio (R$);Cliques;Impressões;% da Verba do Mês');
  rel.topCampanhas.forEach((camp) => {
    linhas.push(
      `"${camp.nomeCampanha}";${camp.valorGasto.toFixed(2).replace('.', ',')};${camp.leads};${camp.custoPorLead.toFixed(2).replace('.', ',')};${camp.cliques};${camp.impressoes};${camp.shareGasto.toFixed(1).replace('.', ',')}%`
    );
  });

  return linhas.join('\n');
}
