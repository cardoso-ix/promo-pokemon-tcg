import { db } from '../db/database.js';
import { getBrazilToday, getBrazilDateStr } from '../utils/date.js';
import { meliAffiliateService } from './meli-affiliate.service.js';
import { getMetaInsightsStats } from '../db/database.js';
import path from 'node:path';
import fs from 'node:fs';

export interface BalancoItem {
  id?: number;
  dataLancamento: string;
  gastoCampanhas: number;
  lucroBruto: number;
  vendasBrutas: number;
  comissaoAmazon?: number;
  vendasAmazon?: number;
  itensAmazon?: number;
  saldoDia: number;
  blendedRoas: number;
  cliquesMeta: number;
  impressoesMeta: number;
  descricao?: string;
  categoria?: string;
  origem?: 'auto' | 'manual';
}

export interface BalancoMensalResult {
  mesReferencia: string;
  totalLucroBruto: number; // Comissões confirmadas Meli + Amazon
  totalComissaoAmazon?: number;
  totalVendasAmazon?: number;
  totalItensAmazon?: number;
  totalGastoCampanhas: number; // Investimento Meta Ads
  totalVendasBrutas: number; // Faturamento enviado ao Meli + Amazon
  resultadoLiquido: number; // Lucro operacional
  valorReinvestimentoCampanhas: number; // 70%
  valorLucroDisponivel: number; // 30%
  blendedRoas: number;
  avgCac: number;
  margemPercentual: number;
  itens: BalancoItem[];
}

export interface DespesaPdfItem {
  id: number;
  dataDespesa: string;
  valor: number;
  descricao: string;
  nomeArquivoOriginal: string;
  tamanhoBytes: number;
  criadoEm: string;
}

export class FinancasService {
  constructor() {
    this.initTables();
  }

  private initTables() {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS financas_despesas_pdf (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          data_despesa DATE NOT NULL,
          valor REAL NOT NULL,
          descricao TEXT,
          nome_arquivo TEXT NOT NULL,
          caminho_arquivo TEXT,
          tamanho_bytes INTEGER,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS financas_planilhas_meta (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome_arquivo TEXT NOT NULL,
          mes_referencia TEXT NOT NULL,
          gasto_total REAL NOT NULL,
          impressoes_total INTEGER DEFAULT 0,
          cliques_total INTEGER DEFAULT 0,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS financas_lancamentos_diarios (
          data_lancamento TEXT PRIMARY KEY,
          lucro_bruto REAL NOT NULL DEFAULT 0.0,
          vendas_brutas REAL NOT NULL DEFAULT 0.0,
          gasto_campanhas REAL NOT NULL DEFAULT 0.0,
          cliques_meta INTEGER NOT NULL DEFAULT 0,
          impressoes_meta INTEGER NOT NULL DEFAULT 0,
          origem TEXT DEFAULT 'auto',
          descricao TEXT,
          categoria TEXT,
          comissao_amazon REAL DEFAULT 0.0,
          vendas_amazon REAL DEFAULT 0.0,
          itens_amazon INTEGER DEFAULT 0,
          atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      try {
        db.prepare('ALTER TABLE financas_lancamentos_diarios ADD COLUMN comissao_amazon REAL DEFAULT 0.0').run();
      } catch {}
      try {
        db.prepare('ALTER TABLE financas_lancamentos_diarios ADD COLUMN vendas_amazon REAL DEFAULT 0.0').run();
      } catch {}
      try {
        db.prepare('ALTER TABLE financas_lancamentos_diarios ADD COLUMN itens_amazon INTEGER DEFAULT 0').run();
      } catch {}

      // Garante bootstrap do dia 2026-09-27 caso ainda não esteja preenchido
      try {
        const row27 = db.prepare('SELECT data_lancamento, lucro_bruto FROM financas_lancamentos_diarios WHERE data_lancamento = ?').get('2026-09-27') as any;
        if (!row27 || Number(row27.lucro_bruto) === 0) {
          db.prepare(`
            INSERT INTO financas_lancamentos_diarios (
              data_lancamento, lucro_bruto, vendas_brutas, gasto_campanhas, cliques_meta, impressoes_meta, origem, descricao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(data_lancamento) DO UPDATE SET
              lucro_bruto = excluded.lucro_bruto,
              vendas_brutas = excluded.vendas_brutas,
              gasto_campanhas = excluded.gasto_campanhas,
              cliques_meta = excluded.cliques_meta,
              impressoes_meta = excluded.impressoes_meta,
              atualizado_em = CURRENT_TIMESTAMP
          `).run('2026-09-27', 8.85, 89.90, 19.79, 40, 1836, 'auto', 'Comissões consolidadas Mercado Livre');
        }
      } catch {
        // Silencioso
      }

      // Garante calibração oficial do dia 2026-10-03 (Comissões Meli R$ 99,04 / Vendas R$ 949,96)
      try {
          const row03 = db.prepare('SELECT data_lancamento, lucro_bruto FROM financas_lancamentos_diarios WHERE data_lancamento = ?').get('2026-10-03') as any;
          if (!row03 || Number(row03.lucro_bruto) < 99.04) {
            db.prepare(`
              INSERT INTO financas_lancamentos_diarios (
                data_lancamento, lucro_bruto, vendas_brutas, gasto_campanhas, cliques_meta, impressoes_meta, origem, descricao, categoria
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(data_lancamento) DO UPDATE SET
                lucro_bruto = excluded.lucro_bruto,
                vendas_brutas = excluded.vendas_brutas,
                origem = excluded.origem,
                descricao = excluded.descricao,
                categoria = excluded.categoria,
                atualizado_em = CURRENT_TIMESTAMP
            `).run('2026-10-03', 99.04, 949.96, 38.75, 169, 2835, 'manual', 'Comissões Mercado Livre Afiliados (Painel Oficial 03/10)', 'mercado_livre');
        }
      } catch {
        // Silencioso
      }

      // Garante bootstrap inicial do dia 2026-10-07 se ainda não estiver preenchido
      try {
        const row07 = db.prepare('SELECT data_lancamento, lucro_bruto FROM financas_lancamentos_diarios WHERE data_lancamento = ?').get('2026-10-07') as any;
        if (!row07) {
          db.prepare(`
            INSERT INTO financas_lancamentos_diarios (
              data_lancamento, lucro_bruto, vendas_brutas, gasto_campanhas, cliques_meta, impressoes_meta, origem, descricao, categoria
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run('2026-10-07', 146.83, 2393.97, 47.28, 25, 3251, 'auto', 'Comissões Mercado Livre Afiliados (Painel Oficial 07/10)', 'mercado_livre');
        }
      } catch {
        // Silencioso
      }
    } catch (err) {
      console.warn('[FinancasService] Aviso ao inicializar tabelas:', err);
    }
  }

  /**
   * Retorna os meses disponíveis com movimentações arquivadas no sistema
   */
  getMesesDisponiveis(): string[] {
    const mesesSet = new Set<string>();
    const hojeMes = getBrazilToday().slice(0, 7);
    mesesSet.add(hojeMes);

    try {
      // Meses de Meta Ads
      const metaRows = db.prepare(`SELECT DISTINCT substr(date, 1, 7) as mes FROM meta_ad_insights`).all() as { mes: string }[];
      for (const r of metaRows) {
        if (r.mes && /^\d{4}-\d{2}$/.test(r.mes)) mesesSet.add(r.mes);
      }

      // Meses de Pedidos Mercado Livre
      const meliRows = db.prepare(`SELECT DISTINCT substr(date_created, 1, 7) as mes FROM meli_orders`).all() as { mes: string }[];
      for (const r of meliRows) {
        if (r.mes && /^\d{4}-\d{2}$/.test(r.mes)) mesesSet.add(r.mes);
      }

      // Meses de Lançamentos Diários
      const lancRows = db.prepare(`SELECT DISTINCT substr(data_lancamento, 1, 7) as mes FROM financas_lancamentos_diarios`).all() as { mes: string }[];
      for (const r of lancRows) {
        if (r.mes && /^\d{4}-\d{2}$/.test(r.mes)) mesesSet.add(r.mes);
      }
    } catch {
      // Silencioso
    }

    return Array.from(mesesSet).sort((a, b) => b.localeCompare(a));
  }

  /**
   * Consolida o Balanço Financeiro e DRE completo a partir das bases do Meta Ads e Mercado Livre
   */
  async getBalancoMensal(mes?: string): Promise<BalancoMensalResult> {
    const mesRef = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : getBrazilToday().slice(0, 7);

    // 1. Busca gastos diários do Meta Ads arquivados para o mês
    const metaDailyRows = db.prepare(`
      SELECT 
        date,
        COALESCE(SUM(spend), 0) as spend,
        COALESCE(SUM(impressions), 0) as impressions,
        COALESCE(SUM(clicks), 0) as clicks,
        COALESCE(SUM(purchases), 0) as purchases
      FROM meta_ad_insights
      WHERE date LIKE ?
      GROUP BY date
      ORDER BY date ASC
    `).all(`${mesRef}-%`) as Array<{
      date: string;
      spend: number;
      impressions: number;
      clicks: number;
      purchases: number;
    }>;

    // 2. Busca dados de afiliados / vendas do Mercado Livre
    const affiliate = await meliAffiliateService.getMetrics().catch(() => null);

    // Mapeamento diário
    const mapaDias: Record<string, BalancoItem> = {};

    // Inserir dados do Meta Ads dia a dia
    for (const m of metaDailyRows) {
      const d = m.date;
      mapaDias[d] = {
        dataLancamento: d,
        gastoCampanhas: Number(m.spend) || 0,
        lucroBruto: 0,
        vendasBrutas: 0,
        saldoDia: -(Number(m.spend) || 0),
        blendedRoas: 0,
        cliquesMeta: Number(m.clicks) || 0,
        impressoesMeta: Number(m.impressions) || 0
      };
    }

    // Inserir dados de comissões diárias de afiliados
    if (affiliate?.dailyData && Array.isArray(affiliate.dailyData)) {
      for (const d of affiliate.dailyData) {
        if (d.date && d.date.startsWith(mesRef)) {
          const dia = d.date;
          if (!mapaDias[dia]) {
            mapaDias[dia] = {
              dataLancamento: dia,
              gastoCampanhas: 0,
              lucroBruto: Number(d.earnings) || 0,
              vendasBrutas: Number(d.earnings ? d.earnings / 0.10 : 0),
              saldoDia: Number(d.earnings) || 0,
              blendedRoas: 0,
              cliquesMeta: 0,
              impressoesMeta: 0
            };
          } else {
            mapaDias[dia].lucroBruto = Number(d.earnings) || 0;
            mapaDias[dia].vendasBrutas = Number(d.earnings ? d.earnings / 0.10 : 0);
            mapaDias[dia].saldoDia = mapaDias[dia].lucroBruto - mapaDias[dia].gastoCampanhas;
          }

          // Salva automaticamente no banco de lançamentos diários se tiver comissões positivas
          if (Number(d.earnings) > 0) {
            try {
              db.prepare(`
                INSERT INTO financas_lancamentos_diarios (
                  data_lancamento, lucro_bruto, vendas_brutas, gasto_campanhas, cliques_meta, impressoes_meta, origem
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(data_lancamento) DO UPDATE SET
                  lucro_bruto = CASE WHEN financas_lancamentos_diarios.origem NOT IN ('auto_reconciliado', 'manual') THEN excluded.lucro_bruto ELSE financas_lancamentos_diarios.lucro_bruto END,
                  vendas_brutas = CASE WHEN financas_lancamentos_diarios.origem NOT IN ('auto_reconciliado', 'manual') THEN excluded.vendas_brutas ELSE financas_lancamentos_diarios.vendas_brutas END,
                  atualizado_em = CURRENT_TIMESTAMP
              `).run(dia, Number(d.earnings) || 0, Number(d.earnings ? d.earnings / 0.10 : 0), mapaDias[dia]?.gastoCampanhas || 0, mapaDias[dia]?.cliquesMeta || 0, mapaDias[dia]?.impressoesMeta || 0, 'auto');
            } catch {
              // Silencioso
            }
          }
        }
      }
    }

    // Fusão resiliente com lançamentos diários permanentes do banco SQLite
    const hojeStr = getBrazilToday();
    try {
      interface LancamentoSalvoRow {
        data_lancamento: string;
        lucro_bruto: number;
        vendas_brutas: number;
        gasto_campanhas: number;
        cliques_meta: number;
        impressoes_meta: number;
        origem: string | null;
        descricao: string | null;
        categoria: string | null;
        comissao_amazon?: number;
        vendas_amazon?: number;
        itens_amazon?: number;
      }

      const lancamentosSalvos = db.prepare(`
        SELECT data_lancamento, lucro_bruto, vendas_brutas, gasto_campanhas, cliques_meta, impressoes_meta, origem, descricao, categoria,
               COALESCE(comissao_amazon, 0) as comissao_amazon,
               COALESCE(vendas_amazon, 0) as vendas_amazon,
               COALESCE(itens_amazon, 0) as itens_amazon
        FROM financas_lancamentos_diarios
        WHERE data_lancamento LIKE ?
      `).all(`${mesRef}-%`) as LancamentoSalvoRow[];

      for (const l of lancamentosSalvos) {
        const dia = l.data_lancamento;
        const origemTipo = (l.origem as 'auto' | 'manual') || 'auto';
        const isHoje = dia === hojeStr;
        const comissaoLiveHoje = isHoje ? (affiliate?.commissionsToday || 0) : 0;
        // O dia de hoje é dinâmico: se a API ao vivo do ML trouxer comissões superiores, prioriza o fluxo vivo
        const apiTemMaisRecente = isHoje && comissaoLiveHoje > Number(l.lucro_bruto);
        const comissaoAmazon = Number(l.comissao_amazon) || 0;
        const vendasAmazon = Number(l.vendas_amazon) || 0;
        const itensAmazon = Number(l.itens_amazon) || 0;

        if (!mapaDias[dia]) {
          mapaDias[dia] = {
            dataLancamento: dia,
            gastoCampanhas: Number(l.gasto_campanhas) || 0,
            lucroBruto: Number(l.lucro_bruto) || 0,
            vendasBrutas: Number(l.vendas_brutas) || (Number(l.lucro_bruto) ? Number(l.lucro_bruto) * 10 : 0),
            comissaoAmazon,
            vendasAmazon,
            itensAmazon,
            saldoDia: (Number(l.lucro_bruto) || 0) - (Number(l.gasto_campanhas) || 0),
            blendedRoas: 0,
            cliquesMeta: Number(l.cliques_meta) || 0,
            impressoesMeta: Number(l.impressoes_meta) || 0,
            descricao: l.descricao || undefined,
            categoria: l.categoria || undefined,
            origem: apiTemMaisRecente ? 'auto' : origemTipo
          };
        } else {
          // Se houver dados da Amazon persistidos, incorpora
          if (comissaoAmazon > 0) {
            mapaDias[dia].comissaoAmazon = comissaoAmazon;
            mapaDias[dia].vendasAmazon = vendasAmazon;
            mapaDias[dia].itensAmazon = itensAmazon;
            // Se o lucro bruto acumulado do dia estiver menor que a soma de comissões, ajusta
            if (Number(l.lucro_bruto) > mapaDias[dia].lucroBruto) {
              mapaDias[dia].lucroBruto = Number(l.lucro_bruto);
              mapaDias[dia].vendasBrutas = Number(l.vendas_brutas);
            }
          }

          // Se for auto_reconciliado, prevalece o extrato auditado oficial do Mercado Livre (com cancelamentos abatidos)
          if (l.origem === 'auto_reconciliado') {
            mapaDias[dia].lucroBruto = Number(l.lucro_bruto) || 0;
            mapaDias[dia].vendasBrutas = Number(l.vendas_brutas) || (Number(l.lucro_bruto) ? Number(l.lucro_bruto) * 10 : 0);
            mapaDias[dia].origem = 'auto_reconciliado';
          } else if ((l.origem === 'manual' && !apiTemMaisRecente) || mapaDias[dia].lucroBruto === 0) {
            if (l.lucro_bruto !== undefined && (l.origem === 'manual' || Number(l.lucro_bruto) > 0)) {
              mapaDias[dia].lucroBruto = Number(l.lucro_bruto) || 0;
              mapaDias[dia].vendasBrutas = Number(l.vendas_brutas) || (Number(l.lucro_bruto) ? Number(l.lucro_bruto) * 10 : 0);
            }
          }
          if (l.origem === 'manual' && !apiTemMaisRecente) {
            if (Number(l.gasto_campanhas) > 0) mapaDias[dia].gastoCampanhas = Number(l.gasto_campanhas);
            if (Number(l.cliques_meta) > 0) mapaDias[dia].cliquesMeta = Number(l.cliques_meta);
            if (Number(l.impressoes_meta) > 0) mapaDias[dia].impressoesMeta = Number(l.impressoes_meta);
            mapaDias[dia].origem = 'manual';
          }
          mapaDias[dia].saldoDia = mapaDias[dia].lucroBruto - mapaDias[dia].gastoCampanhas;
          if (l.descricao) mapaDias[dia].descricao = l.descricao;
          if (l.categoria) mapaDias[dia].categoria = l.categoria;
        }
      }
    } catch (err) {
      console.warn('[FinancasService] Erro ao mesclar financas_lancamentos_diarios:', err);
    }

    // Se o mês atual for o ativo, garante que o dia de hoje está perfeitamente sincronizado com o fluxo ao vivo
    if (hojeStr.startsWith(mesRef)) {
      const metaHoje = getMetaInsightsStats();
      const itemHoje = mapaDias[hojeStr];
      const liveComissao = affiliate?.commissionsToday || 0;
      const liveVendas = affiliate?.totalSalesToday || (liveComissao > 0 ? liveComissao * 10 : 0);

      // O dia corrente é dinâmico: absorve comissões e vendas em tempo real do Mercado Livre
      const deveAtualizarComLive = liveComissao > 0 && (
        itemHoje?.origem !== 'manual' || liveComissao >= (itemHoje?.lucroBruto || 0)
      );

      if (!itemHoje) {
        const dRow = metaDailyRows.find(m => m.date === hojeStr);
        const cliquesHoje = dRow ? Number(dRow.clicks) || 0 : 0;
        const impressoesHoje = dRow ? Number(dRow.impressions) || 0 : 0;
        mapaDias[hojeStr] = {
          dataLancamento: hojeStr,
          gastoCampanhas: metaHoje.spendToday || 0,
          lucroBruto: liveComissao,
          vendasBrutas: liveVendas,
          saldoDia: liveComissao - (metaHoje.spendToday || 0),
          blendedRoas: (metaHoje.spendToday > 0 && liveVendas > 0) ? Number((liveVendas / metaHoje.spendToday).toFixed(2)) : 0,
          cliquesMeta: cliquesHoje,
          impressoesMeta: impressoesHoje,
          origem: 'auto'
        };
      } else {
        if (metaHoje.spendToday > 0) {
          mapaDias[hojeStr].gastoCampanhas = metaHoje.spendToday;
        }
        if (deveAtualizarComLive) {
          mapaDias[hojeStr].lucroBruto = liveComissao;
          mapaDias[hojeStr].vendasBrutas = liveVendas;
          mapaDias[hojeStr].origem = 'auto'; // Transforma para auto para refletir a sincronização
        }
        mapaDias[hojeStr].saldoDia = mapaDias[hojeStr].lucroBruto - mapaDias[hojeStr].gastoCampanhas;
        if (mapaDias[hojeStr].gastoCampanhas > 0 && mapaDias[hojeStr].vendasBrutas > 0) {
          mapaDias[hojeStr].blendedRoas = Number((mapaDias[hojeStr].vendasBrutas / mapaDias[hojeStr].gastoCampanhas).toFixed(2));
        }
      }

      // Auto-persistência atômica da linha de hoje na tabela SQLite financas_lancamentos_diarios
      if (liveComissao > 0) {
        try {
          db.prepare(`
            INSERT INTO financas_lancamentos_diarios (
              data_lancamento, lucro_bruto, vendas_brutas, gasto_campanhas, cliques_meta, impressoes_meta, origem, descricao, categoria
            ) VALUES (?, ?, ?, ?, ?, ?, 'auto', 'Mercado Livre Afiliados (Live Sync)', 'mercado_livre')
            ON CONFLICT(data_lancamento) DO UPDATE SET
              lucro_bruto = excluded.lucro_bruto,
              vendas_brutas = excluded.vendas_brutas,
              gasto_campanhas = CASE WHEN excluded.gasto_campanhas > 0 THEN excluded.gasto_campanhas ELSE financas_lancamentos_diarios.gasto_campanhas END,
              cliques_meta = CASE WHEN excluded.cliques_meta > 0 THEN excluded.cliques_meta ELSE financas_lancamentos_diarios.cliques_meta END,
              impressoes_meta = CASE WHEN excluded.impressoes_meta > 0 THEN excluded.impressoes_meta ELSE financas_lancamentos_diarios.impressoes_meta END,
              origem = 'auto',
              atualizado_em = CURRENT_TIMESTAMP
            WHERE financas_lancamentos_diarios.data_lancamento = ?
              AND (financas_lancamentos_diarios.lucro_bruto <= excluded.lucro_bruto OR financas_lancamentos_diarios.origem != 'manual')
          `).run(
            hojeStr,
            liveComissao,
            liveVendas,
            mapaDias[hojeStr].gastoCampanhas || 0,
            mapaDias[hojeStr].cliquesMeta || 0,
            mapaDias[hojeStr].impressoesMeta || 0,
            hojeStr
          );
        } catch (err) {
          console.warn('[FinancasService] Aviso ao persistir auto-sync de hoje:', err);
        }
      }
    }

    // Se a soma das comissões diárias estiver menor que o total acumulado do mês de afiliados,
    // distribui a proporção real para conciliar fielmente com o extrato
    const listaItens = Object.values(mapaDias).sort((a, b) => b.dataLancamento.localeCompare(a.dataLancamento));

    let totalGastoCampanhas = listaItens.reduce((acc, i) => acc + i.gastoCampanhas, 0);
    let totalLucroBruto = listaItens.reduce((acc, i) => acc + i.lucroBruto, 0);
    let totalVendasBrutas = listaItens.reduce((acc, i) => acc + i.vendasBrutas, 0);

    // Conciliação com o extrato oficial de afiliados
    if (affiliate && affiliate.totalCommissions > totalLucroBruto && mesRef === hojeStr.slice(0, 7)) {
      totalLucroBruto = affiliate.totalCommissions;
      totalVendasBrutas = affiliate.totalSales || totalLucroBruto * 10;
    }

    // Recalcula Blended ROAS diário
    for (const item of listaItens) {
      item.blendedRoas = item.gastoCampanhas > 0 && item.vendasBrutas > 0 ? Number((item.vendasBrutas / item.gastoCampanhas).toFixed(2)) : 0;
    }

    const totalComissaoAmazon = Number(listaItens.reduce((acc, i) => acc + (i.comissaoAmazon || 0), 0).toFixed(2));
    const totalVendasAmazon = Number(listaItens.reduce((acc, i) => acc + (i.vendasAmazon || 0), 0).toFixed(2));
    const totalItensAmazon = listaItens.reduce((acc, i) => acc + (i.itensAmazon || 0), 0);

    const resultadoLiquido = Math.max(0, totalLucroBruto - totalGastoCampanhas);
    const valorReinvestimentoCampanhas = Number((resultadoLiquido * 0.70).toFixed(2));
    const valorLucroDisponivel = Number((resultadoLiquido * 0.30).toFixed(2));
    const blendedRoas = totalGastoCampanhas > 0 && totalVendasBrutas > 0 ? Number((totalVendasBrutas / totalGastoCampanhas).toFixed(2)) : 0;
    const totalOrders = affiliate?.totalOrders || 0;
    const avgCac = totalOrders > 0 && totalGastoCampanhas > 0 ? Number((totalGastoCampanhas / totalOrders).toFixed(2)) : 0;
    const margemPercentual = totalLucroBruto > 0 ? Number(((resultadoLiquido / totalLucroBruto) * 100).toFixed(2)) : 0;

    return {
      mesReferencia: mesRef,
      totalLucroBruto: Number(totalLucroBruto.toFixed(2)),
      totalComissaoAmazon,
      totalVendasAmazon,
      totalItensAmazon,
      totalGastoCampanhas: Number(totalGastoCampanhas.toFixed(2)),
      totalVendasBrutas: Number(totalVendasBrutas.toFixed(2)),
      resultadoLiquido: Number(resultadoLiquido.toFixed(2)),
      valorReinvestimentoCampanhas,
      valorLucroDisponivel,
      blendedRoas,
      avgCac,
      margemPercentual,
      itens: listaItens
    };
  }

  /**
   * Lista comprovantes e faturas PDF arquivadas
   */
  listarFaturasPdf(inicio = '', fim = ''): { totalGasto: number; totalFaturas: number; faturas: DespesaPdfItem[] } {
    let whereClause = '';
    const params: any[] = [];
    if (inicio && fim) {
      whereClause = 'WHERE data_despesa >= ? AND data_despesa <= ?';
      params.push(inicio, fim);
    } else if (inicio) {
      whereClause = 'WHERE data_despesa >= ?';
      params.push(inicio);
    }

    const rows = db.prepare(`
      SELECT id, data_despesa as dataDespesa, valor, descricao, nome_arquivo as nomeArquivoOriginal, tamanho_bytes as tamanhoBytes, criado_em as criadoEm
      FROM financas_despesas_pdf
      ${whereClause}
      ORDER BY data_despesa DESC
    `).all(...params) as DespesaPdfItem[];

    const totalGasto = rows.reduce((acc, r) => acc + Number(r.valor), 0);

    return {
      totalGasto: Number(totalGasto.toFixed(2)),
      totalFaturas: rows.length,
      faturas: rows
    };
  }

  /**
   * Salva uma fatura PDF de comprovante
   */
  salvarFaturaPdf(dados: { dataDespesa: string; valor: number; descricao?: string; nomeArquivo: string; tamanhoBytes?: number }): number {
    const res = db.prepare(`
      INSERT INTO financas_despesas_pdf (data_despesa, valor, descricao, nome_arquivo, tamanho_bytes)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      dados.dataDespesa || getBrazilToday(),
      Number(dados.valor) || 0,
      dados.descricao || 'Fatura Meta Ads',
      dados.nomeArquivo,
      dados.tamanhoBytes || 0
    );
    return Number(res.lastInsertRowid);
  }

  /**
   * Exclui uma fatura PDF de comprovante
   */
  excluirFaturaPdf(id: number): boolean {
    const res = db.prepare('DELETE FROM financas_despesas_pdf WHERE id = ?').run(id);
    return res.changes > 0;
  }

  /**
   * Salva ou atualiza um lançamento financeiro diário
   */
  salvarLancamentoDiario(dados: {
    dataLancamento: string;
    lucroBruto: number;
    vendasBrutas?: number;
    gastoCampanhas?: number;
    cliquesMeta?: number;
    impressoesMeta?: number;
    origem?: 'auto' | 'manual';
    descricao?: string;
    categoria?: string;
  }): { ok: boolean; dataLancamento: string } {
    const dataIso = dados.dataLancamento.split('T')[0];
    const lucro = Number(dados.lucroBruto) || 0;
    const vendas = Number(dados.vendasBrutas) || (lucro > 0 ? lucro * 10 : 0);
    const gasto = Number(dados.gastoCampanhas) || 0;
    const cliques = Number(dados.cliquesMeta) || 0;
    const impressoes = Number(dados.impressoesMeta) || 0;
    const origem = dados.origem || 'manual';

    db.prepare(`
      INSERT INTO financas_lancamentos_diarios (
        data_lancamento, lucro_bruto, vendas_brutas, gasto_campanhas, cliques_meta, impressoes_meta, origem, descricao, categoria, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(data_lancamento) DO UPDATE SET
        lucro_bruto = excluded.lucro_bruto,
        vendas_brutas = excluded.vendas_brutas,
        gasto_campanhas = CASE WHEN excluded.gasto_campanhas > 0 THEN excluded.gasto_campanhas ELSE financas_lancamentos_diarios.gasto_campanhas END,
        cliques_meta = CASE WHEN excluded.cliques_meta > 0 THEN excluded.cliques_meta ELSE financas_lancamentos_diarios.cliques_meta END,
        impressoes_meta = CASE WHEN excluded.impressoes_meta > 0 THEN excluded.impressoes_meta ELSE financas_lancamentos_diarios.impressoes_meta END,
        origem = excluded.origem,
        descricao = excluded.descricao,
        categoria = excluded.categoria,
        atualizado_em = CURRENT_TIMESTAMP
    `).run(dataIso, lucro, vendas, gasto, cliques, impressoes, origem, dados.descricao || null, dados.categoria || null);

    // Também atualiza o dailyData do meliAffiliateService para manter o painel de afiliados sincronizado
    try {
      meliAffiliateService.upsertDailyEntry({
        date: dataIso,
        orders: 1,
        quantity: 1,
        earnings: lucro,
        touchpoints: cliques || 0,
        cvr: cliques > 0 ? Number((1 / cliques).toFixed(4)) : 0
      });
    } catch {
      // Silencioso
    }

    return { ok: true, dataLancamento: dataIso };
  }

  /**
   * Exclui um lançamento financeiro diário manual
   */
  excluirLancamentoDiario(dataLancamento: string): boolean {
    const res = db.prepare('DELETE FROM financas_lancamentos_diarios WHERE data_lancamento = ?').run(dataLancamento.split('T')[0]);
    return res.changes > 0;
  }

  /**
   * Sincroniza forçadamente a linha de hoje de Finanças com os dados ao vivo do Mercado Livre Afiliados
   */
  async sincronizarDiaHojeComAfiliados(): Promise<boolean> {
    const hojeStr = getBrazilToday();
    const affiliate = await meliAffiliateService.getMetrics(false).catch(() => null);
    if (!affiliate || !affiliate.commissionsToday) return false;

    const liveComissao = affiliate.commissionsToday;
    const liveVendas = affiliate.totalSalesToday || (liveComissao > 0 ? liveComissao * 10 : 0);
    const metaHoje = getMetaInsightsStats();

    try {
      db.prepare(`
        INSERT INTO financas_lancamentos_diarios (
          data_lancamento, lucro_bruto, vendas_brutas, gasto_campanhas, cliques_meta, impressoes_meta, origem, descricao, categoria
        ) VALUES (?, ?, ?, ?, ?, ?, 'auto', 'Mercado Livre Afiliados (Auto Sync)', 'mercado_livre')
        ON CONFLICT(data_lancamento) DO UPDATE SET
          lucro_bruto = excluded.lucro_bruto,
          vendas_brutas = excluded.vendas_brutas,
          gasto_campanhas = CASE WHEN excluded.gasto_campanhas > 0 THEN excluded.gasto_campanhas ELSE financas_lancamentos_diarios.gasto_campanhas END,
          cliques_meta = CASE WHEN excluded.cliques_meta > 0 THEN excluded.cliques_meta ELSE financas_lancamentos_diarios.cliques_meta END,
          impressoes_meta = CASE WHEN excluded.impressoes_meta > 0 THEN excluded.impressoes_meta ELSE financas_lancamentos_diarios.impressoes_meta END,
          origem = 'auto',
          atualizado_em = CURRENT_TIMESTAMP
      `).run(
        hojeStr,
        liveComissao,
        liveVendas,
        metaHoje.spendToday || 0,
        metaHoje.totalClicks || 0,
        metaHoje.totalImpressions || 0
      );
      return true;
    } catch (err) {
      console.warn('[FinancasService] Erro ao sincronizar hoje com afiliados:', err);
      return false;
    }
  }

  /**
   * Reconcilia os lançamentos diários dos últimos N dias chamando o motor do MeliAffiliateService
   */
  async reconciliarCancelamentos(janelaDias: number = 7): Promise<{ totalReconciliados: number; cancelamentos: number }> {
    const affiliate = await meliAffiliateService.getMetrics().catch(() => null);
    if (affiliate?.dailyData && Array.isArray(affiliate.dailyData)) {
      return meliAffiliateService.reconciliarJanelaRetroativa(affiliate.dailyData, janelaDias);
    }
    return { totalReconciliados: 0, cancelamentos: 0 };
  }
}

export const financasService = new FinancasService();
