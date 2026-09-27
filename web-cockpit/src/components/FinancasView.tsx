import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Download,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Printer,
  ShieldCheck
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import type {
  BalancoFinanceiro,
  LancamentoDiario
} from '../types/index.ts';
import { api } from '../services/api.ts';

function formatarMoeda(val?: number): string {
  if (typeof val !== 'number' || isNaN(val)) return '0,00';
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const FinancasView: React.FC = () => {
  // Meses e Dados DRE
  const [meses, setMeses] = useState<string[]>([]);
  const [mesAtivo, setMesAtivo] = useState('');
  const [balanco, setBalanco] = useState<BalancoFinanceiro | null>(null);
  const [lancamentos, setLancamentos] = useState<LancamentoDiario[]>([]);
  const [carregandoDRE, setCarregandoDRE] = useState(false);

  // Filtros de Período Financeiro (Dia / Semana / Mês)
  const [periodoFiltro, setPeriodoFiltro] = useState<'mes' | 'semana' | 'dia' | 'todos'>('mes');
  const [diaSelecionado, setDiaSelecionado] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modal Relatório Executivo Mensal (Meta Ads + Mercado Livre)
  const [showRelatorioMensalModal, setShowRelatorioMensalModal] = useState(false);
  const [relatorioMensal, setRelatorioMensal] = useState<any>(null);
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(false);

  // Modal Novo Lançamento Diário
  const [showNovoLancamento, setShowNovoLancamento] = useState(false);
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoLucroML, setNovoLucroML] = useState('');
  const [novoGastoMeta, setNovoGastoMeta] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('mercado_livre');

  // Mensagens de Feedback
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const mostrarFeedback = (tipo: 'sucesso' | 'erro', texto: string) => {
    setFeedback({ tipo, texto });
    setTimeout(() => setFeedback(null), 4000);
  };

  const abrirRelatorioExecutivo = async () => {
    setShowRelatorioMensalModal(true);
    setCarregandoRelatorio(true);
    try {
      const rel = await api.getRelatorioMensal(mesAtivo);
      setRelatorioMensal(rel);
    } catch {
      setRelatorioMensal(null);
    } finally {
      setCarregandoRelatorio(false);
    }
  };

  useEffect(() => {
    carregarMeses();
  }, []);

  useEffect(() => {
    if (mesAtivo) {
      carregarBalancoELancamentos(mesAtivo);
    }
  }, [mesAtivo]);

  const carregarMeses = async () => {
    try {
      const lista = await api.getFinancasMeses();
      const hoje = new Date().toISOString().slice(0, 7);
      const mesesCompletos = lista.length > 0 ? (lista.includes(hoje) ? lista : [hoje, ...lista]) : [hoje];
      setMeses(mesesCompletos);
      setMesAtivo(mesesCompletos[0]);
    } catch {
      const hoje = new Date().toISOString().slice(0, 7);
      setMeses([hoje]);
      setMesAtivo(hoje);
    }
  };

  const carregarBalancoELancamentos = async (mes: string) => {
    setCarregandoDRE(true);
    try {
      const bal = await api.getBalanco(mes).catch(() => null);
      setBalanco(bal);
      setLancamentos(bal?.itens || []);
    } catch {
      setBalanco(null);
      setLancamentos([]);
    } finally {
      setCarregandoDRE(false);
    }
  };

  // Salvar novo lançamento manual diário
  const handleAddLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    const lucro = parseFloat(novoLucroML.replace(',', '.')) || 0;
    const gasto = parseFloat(novoGastoMeta.replace(',', '.')) || 0;

    if (lucro === 0 && gasto === 0) {
      return alert('Informe ao menos o valor de Lucro do Mercado Livre ou Gasto do Meta Ads.');
    }

    try {
      await api.addLancamento({
        dataLancamento: novaData,
        gastoCampanhas: gasto,
        lucroBruto: lucro,
        descricao: novaDescricao || undefined,
        categoria: novaCategoria
      });
      setShowNovoLancamento(false);
      setNovoLucroML('');
      setNovoGastoMeta('');
      setNovaDescricao('');
      mostrarFeedback('sucesso', 'Lançamento diário registrado com sucesso!');
      carregarBalancoELancamentos(mesAtivo);
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha ao registrar lançamento');
    }
  };

  // Excluir lançamento diário
  const handleDeleteLancamento = async (id: number) => {
    if (!confirm('Deseja realmente excluir este lançamento diário?')) return;
    try {
      await api.deleteLancamento(id);
      mostrarFeedback('sucesso', 'Lançamento removido com sucesso!');
      carregarBalancoELancamentos(mesAtivo);
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha ao excluir lançamento');
    }
  };

  // Filtro Dinâmico de Lançamentos por Período (Dia, Semana, Mês)
  const lancamentosFiltrados = React.useMemo(() => {
    if (periodoFiltro === 'dia') {
      return lancamentos.filter(l => {
        const d = (l.dataLancamento || l.data_lancamento || '').split('T')[0];
        return d === diaSelecionado;
      });
    }
    if (periodoFiltro === 'semana') {
      const limite = new Date();
      limite.setDate(limite.getDate() - 7);
      const limiteIso = limite.toISOString().split('T')[0];
      return lancamentos.filter(l => {
        const d = (l.dataLancamento || l.data_lancamento || '').split('T')[0];
        return d >= limiteIso;
      });
    }
    return lancamentos;
  }, [lancamentos, periodoFiltro, diaSelecionado]);

  // Recálculo Reativo dos KPIs do DRE para o Período Filtrado
  const kpisDRE = React.useMemo(() => {
    if (periodoFiltro === 'mes' && balanco) {
      return {
        lucroBruto: balanco.totalLucroBruto || 0,
        gastoCampanhas: balanco.totalGastoCampanhas || 0,
        resultadoLiquido: balanco.resultadoLiquido || 0,
        reinvestimento: balanco.valorReinvestimentoCampanhas || 0,
        lucroDisponivel: balanco.valorLucroDisponivel || 0,
        roi: balanco.roiPercentual || 0,
        margem: balanco.margemLiquidaPercentual || 0,
        status: balanco.status || 'neutro'
      };
    }

    const lucroBruto = lancamentosFiltrados.reduce((acc, l) => acc + (Number(l.lucroBruto ?? l.lucro_bruto) || 0), 0);
    const gastoCampanhas = lancamentosFiltrados.reduce((acc, l) => acc + (Number(l.gastoCampanhas ?? l.gasto_campanhas) || 0), 0);
    const resultadoLiquido = lucroBruto - gastoCampanhas;
    const reinvestimento = resultadoLiquido > 0 ? resultadoLiquido * 0.7 : 0;
    const lucroDisponivel = resultadoLiquido > 0 ? resultadoLiquido * 0.3 : 0;
    const roi = gastoCampanhas > 0 ? ((resultadoLiquido / gastoCampanhas) * 100) : (lucroBruto > 0 ? 100 : 0);
    const margem = lucroBruto > 0 ? ((resultadoLiquido / lucroBruto) * 100) : 0;
    const status: 'lucro' | 'prejuizo' | 'neutro' = resultadoLiquido > 0 ? 'lucro' : resultadoLiquido < 0 ? 'prejuizo' : 'neutro';

    return {
      lucroBruto,
      gastoCampanhas,
      resultadoLiquido,
      reinvestimento,
      lucroDisponivel,
      roi,
      margem,
      status
    };
  }, [lancamentosFiltrados, periodoFiltro, balanco]);

  // Dados para o Gráfico Comparativo Recharts Reativo
  const chartData = [
    {
      nome: 'Lucro ML',
      valor: kpisDRE.lucroBruto,
      fill: '#10b981'
    },
    {
      nome: 'Meta Ads',
      valor: kpisDRE.gastoCampanhas,
      fill: '#ef4444'
    },
    {
      nome: 'Saldo Líquido',
      valor: Math.max(0, kpisDRE.resultadoLiquido),
      fill: '#00e5ff'
    },
    {
      nome: 'Reinvestir (70%)',
      valor: Math.max(0, kpisDRE.reinvestimento),
      fill: '#8b5cf6'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Mensagem Toast de Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-semibold transition-all ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border border-red-500/30 text-red-300'
          }`}
        >
          {feedback.tipo === 'sucesso' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{feedback.texto}</span>
        </div>
      )}

      {/* Header Finanças & DRE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900/90 border border-emerald-500/25 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-extrabold text-white flex items-center gap-2">
              Gestão Financeira & DRE Meta Ads
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest font-mono">
                Dados 100% Reais
              </span>
            </h2>
            <p className="text-xs text-slate-300">
              Controle contábil auditado: lucros do Mercado Livre, faturas e campanhas do Meta Ads com Regra dos 70% de Reinvestimento.
            </p>
          </div>
        </div>

        {/* Seletor de Mês & Ações Principais */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400 font-medium">Mês:</span>
            <select
              value={mesAtivo}
              onChange={e => setMesAtivo(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              {meses.map(m => (
                <option key={m} value={m} className="bg-[#0b1329] text-white">
                  {m}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={abrirRelatorioExecutivo}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
            title="Gerar Relatório Executivo Consolidado do Mês com métricas arquivadas"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            <span>Gerar Relatório do Mês</span>
          </button>

          <button
            onClick={() => setShowNovoLancamento(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-bold border border-white/10 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Novo Ajuste</span>
          </button>

        </div>
      </div>

      {/* Indicador de Modo e Barra de Filtros Rápidos (Dia, Semana, Mês) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm">
            <BarChart3 className="w-4 h-4" />
            <span>Balanço DRE & Extrato Diário</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
              100% Automático via API
            </span>
          </div>
        </div>

        {/* Botoes de Filtro de Período (Dia / Semana / Mês) */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs">
          <button
            type="button"
            onClick={() => setPeriodoFiltro('dia')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              periodoFiltro === 'dia'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Dia</span>
          </button>

          {periodoFiltro === 'dia' && (
            <input
              type="date"
              value={diaSelecionado}
              onChange={e => setDiaSelecionado(e.target.value)}
              className="px-2 py-0.5 rounded-lg bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs font-mono focus:outline-none cursor-pointer"
            />
          )}

          <button
            type="button"
            onClick={() => setPeriodoFiltro('semana')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              periodoFiltro === 'semana'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Semana (7d)</span>
          </button>

          <button
            type="button"
            onClick={() => setPeriodoFiltro('mes')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              periodoFiltro === 'mes'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Mês Completo</span>
          </button>

          <button
            type="button"
            onClick={() => setPeriodoFiltro('todos')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              periodoFiltro === 'todos'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <span>Todos</span>
          </button>

          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 text-[10px] font-mono ml-1">
            {lancamentosFiltrados.length} {lancamentosFiltrados.length === 1 ? 'dia' : 'dias'}
          </span>
        </div>
      </div>

      <div className="space-y-6">
          {/* Grid de KPIs do DRE Mensal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Lucro Bruto / Comissões Mercado Livre */}
            <div className="glass-panel rounded-2xl p-5 border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-transparent">
              <span className="text-[11px] text-emerald-400 uppercase tracking-wider font-bold">
                Lucro Bruto (Mercado Livre)
              </span>
              <div className="text-2xl font-heading font-extrabold text-white mt-1">
                R$ {formatarMoeda(kpisDRE.lucroBruto)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 inline-block">
                {periodoFiltro === 'dia'
                  ? `Filtro: Dia ${diaSelecionado}`
                  : periodoFiltro === 'semana'
                  ? 'Filtro: Últimos 7 dias (Semana)'
                  : periodoFiltro === 'todos'
                  ? 'Total acumulado geral'
                  : `Total acumulado no mês ${mesAtivo}`}
              </span>
            </div>

            {/* Card 2: Investimento Total em Campanhas Meta Ads */}
            <div className="glass-panel rounded-2xl p-5 border border-red-500/20 bg-gradient-to-br from-red-950/20 to-transparent">
              <span className="text-[11px] text-red-400 uppercase tracking-wider font-bold">
                Gasto em Tráfego (Meta Ads)
              </span>
              <div className="text-2xl font-heading font-extrabold text-red-400 mt-1">
                R$ {formatarMoeda(kpisDRE.gastoCampanhas)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 inline-block">
                ROI: {kpisDRE.roi.toFixed(1)}% | Margem: {kpisDRE.margem.toFixed(1)}%
              </span>
            </div>

            {/* Card 3: Resultado Líquido Real */}
            <div className="glass-panel rounded-2xl p-5 border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-transparent">
              <span className="text-[11px] text-cyan-400 uppercase tracking-wider font-bold">
                Resultado Líquido ({periodoFiltro === 'dia' ? 'Dia' : periodoFiltro === 'semana' ? 'Semana' : 'Mês'})
              </span>
              <div
                className={`text-2xl font-heading font-extrabold mt-1 ${
                  kpisDRE.resultadoLiquido >= 0 ? 'text-cyan-300' : 'text-red-400'
                }`}
              >
                R$ {formatarMoeda(kpisDRE.resultadoLiquido)}
              </div>
              <span
                className={`text-[11px] font-semibold mt-1 inline-block ${
                  kpisDRE.status === 'lucro'
                    ? 'text-emerald-400'
                    : kpisDRE.status === 'prejuizo'
                    ? 'text-red-400'
                    : 'text-slate-400'
                }`}
              >
                {kpisDRE.status === 'lucro'
                  ? 'Lucro Líquido Positivo'
                  : kpisDRE.status === 'prejuizo'
                  ? 'Prejuízo Operacional'
                  : 'Equilíbrio'}
              </span>
            </div>

            {/* Card 4: Política de Reinvestimento (Regra dos 70%) */}
            <div className="glass-panel rounded-2xl p-5 border border-purple-500/20 bg-gradient-to-br from-purple-950/25 to-transparent">
              <span className="text-[11px] text-purple-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Reinvestir (70%)
              </span>
              <div className="text-2xl font-heading font-extrabold text-white mt-1">
                R$ {formatarMoeda(kpisDRE.reinvestimento)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 inline-block">
                Retirada livre (30%): R$ {formatarMoeda(kpisDRE.lucroDisponivel)}
              </span>
            </div>
          </div>

          {/* Gráfico do DRE Comparativo */}
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Demonstrativo de Resultado do Exercício (DRE) - {
                    periodoFiltro === 'dia'
                      ? `Dia ${diaSelecionado}`
                      : periodoFiltro === 'semana'
                      ? 'Últimos 7 Dias (Semana)'
                      : periodoFiltro === 'todos'
                      ? 'Geral Acumulado'
                      : `Mês ${mesAtivo}`
                  }
                </h3>
                <p className="text-xs text-slate-400">
                  Comparativo entre faturamento bruto, custos de aquisição Meta Ads e margens operacionais
                </p>
              </div>
              <button
                onClick={() => api.exportarBalancoCsv(mesAtivo)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold border border-white/10 transition-all self-start sm:self-auto cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exportar Balanço CSV</span>
              </button>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="nome" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => [`R$ ${formatarMoeda(Number(val))}`, 'Valor']}
                    contentStyle={{
                      backgroundColor: '#0d1527',
                      borderColor: 'rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="valor" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela de Lançamentos Diários */}
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Extrato de Lançamentos ({lancamentosFiltrados.length})
                </h3>
                <p className="text-xs text-slate-400">
                  {periodoFiltro === 'dia'
                    ? `Registros filtrados para o dia ${diaSelecionado}`
                    : periodoFiltro === 'semana'
                    ? 'Registros consolidados dos últimos 7 dias'
                    : periodoFiltro === 'todos'
                    ? 'Todos os registros disponíveis no banco de dados'
                    : `Histórico detalhado por dia de vendas no Mercado Livre e gastos com Meta Ads no mês ${mesAtivo}`}
                </p>
              </div>
              <button
                onClick={() => setShowNovoLancamento(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Dia</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.06] bg-white/[0.01]">
                  <tr>
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3 text-right">Gasto Meta Ads</th>
                    <th className="py-2.5 px-3 text-right">Cliques / Impr.</th>
                    <th className="py-2.5 px-3 text-right">Comissões Meli</th>
                    <th className="py-2.5 px-3 text-right">Vendas Geradas</th>
                    <th className="py-2.5 px-3 text-right">Saldo Líquido</th>
                    <th className="py-2.5 px-3 text-right">Blended ROAS</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {carregandoDRE ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        Carregando lançamentos...
                      </td>
                    </tr>
                  ) : lancamentosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-500">
                        Nenhum registro encontrado no filtro selecionado (
                        {periodoFiltro === 'dia'
                          ? `Dia ${diaSelecionado}`
                          : periodoFiltro === 'semana'
                          ? 'Últimos 7 dias'
                          : `Mês ${mesAtivo}`}
                        ). Clique em{' '}
                        <strong className="text-emerald-400 cursor-pointer" onClick={abrirRelatorioExecutivo}>
                          Gerar Relatório do Mês
                        </strong>{' '}
                        para consolidar os dados das bases Meta Ads e Mercado Livre.
                      </td>
                    </tr>
                  ) : (
                    lancamentosFiltrados.map((l, idx) => {
                      const dataLanc = l.dataLancamento || l.data_lancamento || '—';
                      const gasto = Number(l.gastoCampanhas ?? l.gasto_campanhas) || 0;
                      const lucro = Number(l.lucroBruto ?? l.lucro_bruto) || 0;
                      const vendas = Number(l.vendasBrutas ?? l.vendas_brutas) || (lucro > 0 ? lucro * 10 : 0);
                      const saldo = typeof l.saldoDia === 'number' ? l.saldoDia : lucro - gasto;
                      const cliques = Number(l.cliquesMeta || 0);
                      const impressoes = Number(l.impressoesMeta || 0);
                      const roas = typeof l.blendedRoas === 'number' && l.blendedRoas > 0
                        ? l.blendedRoas
                        : (gasto > 0 && vendas > 0 ? (vendas / gasto) : 0);

                      return (
                        <tr key={l.id || idx} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-300">
                            {dataLanc}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-red-400">
                            {gasto > 0 ? `R$ ${formatarMoeda(gasto)}` : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-400 text-[11px]">
                            {cliques > 0 || impressoes > 0 ? (
                              <span>{cliques} <span className="text-slate-600">/</span> {impressoes}</span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-semibold">
                            {lucro > 0 ? `R$ ${formatarMoeda(lucro)}` : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-cyan-300">
                            {vendas > 0 ? `R$ ${formatarMoeda(vendas)}` : <span className="text-slate-600">—</span>}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-bold ${
                              saldo >= 0 ? 'text-emerald-300' : 'text-red-400'
                            }`}
                          >
                            {saldo >= 0 ? '+' : ''} R$ {formatarMoeda(saldo)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {roas > 0 ? (
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                roas >= 4 ? 'bg-emerald-500/20 text-emerald-300' : roas >= 2 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'
                              }`}>
                                {roas.toFixed(2)}x
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {l.id && (
                              <button
                                onClick={() => handleDeleteLancamento(l.id)}
                                className="text-slate-500 hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
                                title="Excluir Lançamento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>


      {/* MODAL: NOVO LANÇAMENTO DIÁRIO MANUAL */}
      {showNovoLancamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel rounded-2xl p-6 border border-white/15 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Registrar Lançamento Diário Real
              </h3>
              <button
                onClick={() => setShowNovoLancamento(false)}
                className="text-slate-400 hover:text-white p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLancamento} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Data do Lançamento</label>
                <input
                  type="date"
                  value={novaData}
                  onChange={e => setNovaData(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-400 mb-1">
                    Lucro Bruto ML (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={novoLucroML}
                    onChange={e => setNovoLucroML(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-emerald-500/30 text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500">Comissões do dia</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-red-400 mb-1">
                    Gasto Meta Ads (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={novoGastoMeta}
                    onChange={e => setNovoGastoMeta(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-red-500/30 text-red-300 font-mono text-xs focus:outline-none focus:border-red-500"
                  />
                  <span className="text-[10px] text-slate-500">Consumo em anúncios</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
                <select
                  value={novaCategoria}
                  onChange={e => setNovaCategoria(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="mercado_livre">Mercado Livre (Comissões & Vendas)</option>
                  <option value="meta_ads">Meta Ads (Tráfego Pago)</option>
                  <option value="shopee">Shopee Afiliados</option>
                  <option value="geral">Geral / Operacional</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrição / Campanha (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Campanha Coleções Pokémon TCG Booster Box"
                  value={novaDescricao}
                  onChange={e => setNovaDescricao(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowNovoLancamento(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RELATÓRIO EXECUTIVO MENSAL INTEGRADO */}
      {showRelatorioMensalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/20 max-w-5xl w-full my-auto space-y-6 shadow-2xl bg-[#080d1a]/95 text-white max-h-[92vh] overflow-y-auto">
            
            {/* Topbar do Relatório */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-bold tracking-widest">
                    Relatório Oficial de Auditoria
                  </span>
                  <span className="text-slate-400 text-xs font-mono">
                    Ref: {mesAtivo}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white mt-1">
                  Relatório Executivo de Aquisição & Performance
                </h2>
                <p className="text-xs text-slate-300">
                  Consolidação automática dos dados arquivados do Meta Ads e Mercado Livre Afiliados.
                </p>
              </div>

              {/* Botões de Ação do Relatório */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold border border-white/15 transition-all cursor-pointer"
                  title="Imprimir ou Salvar em PDF"
                >
                  <Printer className="w-4 h-4 text-cyan-400" />
                  <span>Imprimir / PDF</span>
                </button>

                <button
                  onClick={() => api.exportarBalancoCsv(mesAtivo)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer"
                  title="Exportar dados para Excel ou CSV"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar CSV</span>
                </button>

                <button
                  onClick={() => setShowRelatorioMensalModal(false)}
                  className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="Fechar Relatório"
                >
                  ✕
                </button>
              </div>
            </div>

            {carregandoRelatorio ? (
              <div className="py-20 text-center text-slate-400 text-sm">
                Carregando e consolidando métricas do mês {mesAtivo}...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Grade dos 6 KPIs Executivos */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Faturamento Meli
                    </span>
                    <div className="text-lg font-heading font-extrabold text-white mt-1">
                      R$ {formatarMoeda(relatorioMensal?.kpis?.faturamentoMeli ?? (balanco as any)?.totalVendasBrutas)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/25">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                      Comissões Confirmadas
                    </span>
                    <div className="text-lg font-heading font-extrabold text-emerald-400 mt-1">
                      R$ {formatarMoeda(relatorioMensal?.kpis?.comissoesConfirmadasMeli ?? balanco?.totalLucroBruto)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-500/25">
                    <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">
                      Gasto Meta Ads
                    </span>
                    <div className="text-lg font-heading font-extrabold text-red-400 mt-1">
                      R$ {formatarMoeda(relatorioMensal?.kpis?.investimentoMetaAds ?? balanco?.totalGastoCampanhas)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/25">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                      Lucro Líquido Real
                    </span>
                    <div className="text-lg font-heading font-extrabold text-cyan-300 mt-1">
                      R$ {formatarMoeda(relatorioMensal?.kpis?.lucroOperacionalLiquido ?? balanco?.resultadoLiquido)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                      Blended ROAS
                    </span>
                    <div className="text-lg font-heading font-extrabold text-purple-300 mt-1">
                      {(relatorioMensal?.kpis?.blendedRoas ?? (balanco as any)?.blendedRoas ?? 0).toFixed(2)}x
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                      Margem Líquida
                    </span>
                    <div className="text-lg font-heading font-extrabold text-amber-300 mt-1">
                      {(relatorioMensal?.kpis?.margemLucroPercentual ?? balanco?.margemLiquidaPercentual ?? 0).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Quadro da Regra dos 70/30 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4.5 rounded-2xl bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-emerald-950/30 border border-purple-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-purple-300 font-bold uppercase tracking-wide">
                        Reinvestimento em Campanhas (70%)
                      </span>
                      <div className="text-xl font-heading font-extrabold text-white mt-0.5">
                        R$ {formatarMoeda(relatorioMensal?.kpis?.reservaReinvestimento70 ?? balanco?.valorReinvestimentoCampanhas)}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Capital destinado para escala de tráfego pago no próximo ciclo.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-emerald-400 font-bold uppercase tracking-wide">
                        Lucro Disponível para Retirada (30%)
                      </span>
                      <div className="text-xl font-heading font-extrabold text-white mt-0.5">
                        R$ {formatarMoeda(relatorioMensal?.kpis?.lucroDisponivel30 ?? balanco?.valorLucroDisponivel)}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Retirada líquida de sócios sem descapitalizar o tráfego.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabela de Métricas Arquivadas Dia a Dia */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      Histórico Arquivado Dia a Dia ({relatorioMensal?.detalhamentoDiario?.length || lancamentos.length} dias)
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Dados auditados via API
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-white/10 max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-white/10 bg-[#0e172a] sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3">Data</th>
                          <th className="py-2.5 px-3 text-right">Investimento Meta</th>
                          <th className="py-2.5 px-3 text-right">Cliques Meta</th>
                          <th className="py-2.5 px-3 text-right">Impressões</th>
                          <th className="py-2.5 px-3 text-right">Vendas Meli</th>
                          <th className="py-2.5 px-3 text-right">Comissão Meli</th>
                          <th className="py-2.5 px-3 text-right">Saldo Líquido</th>
                          <th className="py-2.5 px-3 text-right">ROAS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04] bg-white/[0.01]">
                        {((relatorioMensal?.detalhamentoDiario || lancamentos) as any[]).map((d, i) => {
                          const dataDia = d.dataLancamento || d.data_lancamento || '—';
                          const gasto = Number(d.gastoCampanhas ?? d.gasto_campanhas) || 0;
                          const lucro = Number(d.lucroBruto ?? d.lucro_bruto) || 0;
                          const vendas = Number(d.vendasBrutas ?? d.vendas_brutas) || (lucro > 0 ? lucro * 10 : 0);
                          const saldo = typeof d.saldoDia === 'number' ? d.saldoDia : lucro - gasto;
                          const cliques = Number(d.cliquesMeta || 0);
                          const impressoes = Number(d.impressoesMeta || 0);
                          const roas = typeof d.blendedRoas === 'number' && d.blendedRoas > 0
                            ? d.blendedRoas
                            : (gasto > 0 && vendas > 0 ? (vendas / gasto) : 0);

                          return (
                            <tr key={i} className="hover:bg-white/[0.03]">
                              <td className="py-2 px-3 font-mono font-medium text-slate-300">
                                {dataDia}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-red-400">
                                {gasto > 0 ? `R$ ${formatarMoeda(gasto)}` : <span className="text-slate-600">—</span>}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-400">
                                {cliques > 0 ? cliques : <span className="text-slate-600">—</span>}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-400">
                                {impressoes > 0 ? impressoes : <span className="text-slate-600">—</span>}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-cyan-300">
                                {vendas > 0 ? `R$ ${formatarMoeda(vendas)}` : <span className="text-slate-600">—</span>}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-emerald-400 font-semibold">
                                {lucro > 0 ? `R$ ${formatarMoeda(lucro)}` : <span className="text-slate-600">—</span>}
                              </td>
                              <td
                                className={`py-2 px-3 text-right font-mono font-bold ${
                                  saldo >= 0 ? 'text-emerald-300' : 'text-red-400'
                                }`}
                              >
                                {saldo >= 0 ? '+' : ''} R$ {formatarMoeda(saldo)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono">
                                {roas > 0 ? (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    roas >= 4 ? 'bg-emerald-500/20 text-emerald-300' : roas >= 2 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'
                                  }`}>
                                    {roas.toFixed(2)}x
                                  </span>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Rodapé do Relatório */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Relatório emitido pelo Cockpit Promos Pokémon TCG • Conciliação Meta + Mercado Livre</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRelatorioMensalModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-semibold transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
