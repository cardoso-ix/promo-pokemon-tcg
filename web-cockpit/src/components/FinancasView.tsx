import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Upload,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  FileText,
  Download,
  Eye,
  BarChart3,
  CheckCircle2,
  AlertCircle
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
  LancamentoDiario,
  ResumoDespesasPdf,
  UploadPlanilhaFinancas
} from '../types/index.ts';
import { api } from '../services/api.ts';

function formatarMoeda(val?: number): string {
  if (typeof val !== 'number' || isNaN(val)) return '0,00';
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const FinancasView: React.FC = () => {
  // Aba Ativa interna do módulo financeiro
  const [subAba, setSubAba] = useState<'dre' | 'faturas' | 'planilhas'>('dre');

  // Meses e Dados DRE
  const [meses, setMeses] = useState<string[]>([]);
  const [mesAtivo, setMesAtivo] = useState('');
  const [balanco, setBalanco] = useState<BalancoFinanceiro | null>(null);
  const [lancamentos, setLancamentos] = useState<LancamentoDiario[]>([]);
  const [carregandoDRE, setCarregandoDRE] = useState(false);

  // Faturas PDF do Meta Ads
  const [despesasResumo, setDespesasResumo] = useState<ResumoDespesasPdf | null>(null);
  const [carregandoFaturas, setCarregandoFaturas] = useState(false);
  const [filtroDataInicio] = useState('');
  const [filtroDataFim] = useState('');

  // Planilhas Semanais
  const [uploadsPlanilhas, setUploadsPlanilhas] = useState<UploadPlanilhaFinancas[]>([]);
  const [carregandoPlanilhas, setCarregandoPlanilhas] = useState(false);

  // Modal Novo Lançamento Diário
  const [showNovoLancamento, setShowNovoLancamento] = useState(false);
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoLucroML, setNovoLucroML] = useState('');
  const [novoGastoMeta, setNovoGastoMeta] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('mercado_livre');

  // Modal Subir Fatura PDF
  const [showUploadPdfModal, setShowUploadPdfModal] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDescricao, setPdfDescricao] = useState('');
  const [pdfValor, setPdfValor] = useState('');
  const [pdfData, setPdfData] = useState(new Date().toISOString().split('T')[0]);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Upload Planilha Semanal
  const [uploadingPlanilha, setUploadingPlanilha] = useState(false);

  // Mensagens de Feedback
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const mostrarFeedback = (tipo: 'sucesso' | 'erro', texto: string) => {
    setFeedback({ tipo, texto });
    setTimeout(() => setFeedback(null), 4000);
  };

  useEffect(() => {
    carregarMeses();
    carregarFaturas();
  }, []);

  useEffect(() => {
    if (mesAtivo) {
      carregarBalancoELancamentos(mesAtivo);
      carregarPlanilhas(mesAtivo);
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

  const carregarFaturas = async () => {
    setCarregandoFaturas(true);
    try {
      const resumo = await api.getDespesasPdf(filtroDataInicio, filtroDataFim);
      setDespesasResumo(resumo);
    } catch {
      setDespesasResumo(null);
    } finally {
      setCarregandoFaturas(false);
    }
  };

  const carregarPlanilhas = async (mes: string) => {
    setCarregandoPlanilhas(true);
    try {
      const lista = await api.getUploadsPlanilhas(mes);
      setUploadsPlanilhas(lista);
    } catch {
      setUploadsPlanilhas([]);
    } finally {
      setCarregandoPlanilhas(false);
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

  // Upload de fatura PDF
  const handleUploadPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return alert('Selecione um arquivo PDF de fatura do Meta Ads.');

    const formData = new FormData();
    formData.append('file', pdfFile);
    if (pdfData) formData.append('dataDespesa', pdfData);
    if (pdfValor) formData.append('valor', pdfValor.replace(',', '.'));
    if (pdfDescricao) formData.append('descricao', pdfDescricao);

    setUploadingPdf(true);
    try {
      const res = await api.uploadDespesaPdf(formData);
      setShowUploadPdfModal(false);
      setPdfFile(null);
      setPdfDescricao('');
      setPdfValor('');
      mostrarFeedback('sucesso', res.message || 'Fatura PDF cadastrada e arquivada com sucesso!');
      carregarFaturas();
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha no upload da fatura PDF');
    } finally {
      setUploadingPdf(false);
    }
  };

  // Excluir fatura PDF
  const handleDeleteDespesa = async (id: number) => {
    if (!confirm('Deseja excluir esta fatura PDF arquivada e remover seu valor do total?')) return;
    try {
      await api.deleteDespesaPdf(id);
      mostrarFeedback('sucesso', 'Fatura PDF removida com sucesso!');
      carregarFaturas();
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha ao remover fatura');
    }
  };

  // Upload de Planilha Semanal XLSX/CSV
  const handleUploadPlanilha = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mesReferencia', mesAtivo);

    setUploadingPlanilha(true);
    try {
      const res = await api.uploadPlanilhaSemanal(formData);
      mostrarFeedback('sucesso', res.message || 'Planilha do Meta Ads processada e arquivada com sucesso!');
      carregarPlanilhas(mesAtivo);
      carregarBalancoELancamentos(mesAtivo);
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha ao importar planilha semanal');
    } finally {
      setUploadingPlanilha(false);
      e.target.value = '';
    }
  };

  // Dados para o Gráfico Comparativo Recharts
  const chartData = [
    {
      nome: 'Lucro ML',
      valor: balanco?.totalLucroBruto || 0,
      fill: '#10b981'
    },
    {
      nome: 'Meta Ads',
      valor: balanco?.totalGastoCampanhas || 0,
      fill: '#ef4444'
    },
    {
      nome: 'Saldo Líquido',
      valor: Math.max(0, balanco?.resultadoLiquido || 0),
      fill: '#00e5ff'
    },
    {
      nome: 'Reinvestir (70%)',
      valor: Math.max(0, balanco?.valorReinvestimentoCampanhas || 0),
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
            onClick={() => setShowNovoLancamento(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Lançamento</span>
          </button>

          <button
            onClick={() => setShowUploadPdfModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-semibold border border-white/15 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Subir Fatura PDF</span>
          </button>
        </div>
      </div>

      {/* Abas Internas de Finanças */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
        <button
          onClick={() => setSubAba('dre')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subAba === 'dre'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Balanço DRE & Extrato Diário</span>
          {lancamentos.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-[10px] text-emerald-200">
              {lancamentos.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setSubAba('faturas');
            carregarFaturas();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subAba === 'faturas'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Faturas em PDF Meta Ads</span>
          {(despesasResumo?.totalFaturas || 0) > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/30 text-[10px] text-cyan-200">
              {despesasResumo?.totalFaturas}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setSubAba('planilhas');
            carregarPlanilhas(mesAtivo);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subAba === 'planilhas'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Planilhas Semanais Meta</span>
          {uploadsPlanilhas.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-[10px] text-indigo-200">
              {uploadsPlanilhas.length}
            </span>
          )}
        </button>
      </div>

      {/* SUB-ABA 1: DEMONSTRATIVO DRE & LANÇAMENTOS DIÁRIOS */}
      {subAba === 'dre' && (
        <div className="space-y-6">
          {/* Grid de KPIs do DRE Mensal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Lucro Bruto / Comissões Mercado Livre */}
            <div className="glass-panel rounded-2xl p-5 border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-transparent">
              <span className="text-[11px] text-emerald-400 uppercase tracking-wider font-bold">
                Lucro Bruto (Mercado Livre)
              </span>
              <div className="text-2xl font-heading font-extrabold text-white mt-1">
                R$ {formatarMoeda(balanco?.totalLucroBruto)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 inline-block">
                Total acumulado no mês {mesAtivo}
              </span>
            </div>

            {/* Card 2: Investimento Total em Campanhas Meta Ads */}
            <div className="glass-panel rounded-2xl p-5 border border-red-500/20 bg-gradient-to-br from-red-950/20 to-transparent">
              <span className="text-[11px] text-red-400 uppercase tracking-wider font-bold">
                Gasto em Tráfego (Meta Ads)
              </span>
              <div className="text-2xl font-heading font-extrabold text-red-400 mt-1">
                R$ {formatarMoeda(balanco?.totalGastoCampanhas)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 inline-block">
                ROI: {(balanco?.roiPercentual || 0).toFixed(1)}% | Margem: {(balanco?.margemLiquidaPercentual || 0).toFixed(1)}%
              </span>
            </div>

            {/* Card 3: Resultado Líquido Real */}
            <div className="glass-panel rounded-2xl p-5 border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-transparent">
              <span className="text-[11px] text-cyan-400 uppercase tracking-wider font-bold">
                Resultado Líquido do Mês
              </span>
              <div
                className={`text-2xl font-heading font-extrabold mt-1 ${
                  (balanco?.resultadoLiquido || 0) >= 0 ? 'text-cyan-300' : 'text-red-400'
                }`}
              >
                R$ {formatarMoeda(balanco?.resultadoLiquido)}
              </div>
              <span
                className={`text-[11px] font-semibold mt-1 inline-block ${
                  balanco?.status === 'lucro'
                    ? 'text-emerald-400'
                    : balanco?.status === 'prejuizo'
                    ? 'text-red-400'
                    : 'text-slate-400'
                }`}
              >
                {balanco?.status === 'lucro'
                  ? 'Lucro Líquido Positivo'
                  : balanco?.status === 'prejuizo'
                  ? 'Prejuízo Operacional'
                  : 'Equilíbrio'}
              </span>
            </div>

            {/* Card 4: Política de Reinvestimento (Regra dos 70%) */}
            <div className="glass-panel rounded-2xl p-5 border border-purple-500/20 bg-gradient-to-br from-purple-950/25 to-transparent">
              <span className="text-[11px] text-purple-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Reinvestir ({balanco?.percentualReinvestimento || 70}%)
              </span>
              <div className="text-2xl font-heading font-extrabold text-white mt-1">
                R$ {formatarMoeda(balanco?.valorReinvestimentoCampanhas)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 inline-block">
                Retirada livre (30%): R$ {formatarMoeda(balanco?.valorLucroDisponivel)}
              </span>
            </div>
          </div>

          {/* Gráfico do DRE Comparativo */}
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Demonstrativo de Resultado do Exercício (DRE) - {mesAtivo}
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
                  Extrato de Lançamentos Diários ({lancamentos.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Histórico detalhado por dia de vendas no Mercado Livre e gastos com Meta Ads
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
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3">Descrição / Campanha</th>
                    <th className="py-2.5 px-3 text-right">Gasto Meta Ads</th>
                    <th className="py-2.5 px-3 text-right">Lucro Bruto ML</th>
                    <th className="py-2.5 px-3 text-right">Saldo Líquido</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {carregandoDRE ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        Carregando lançamentos...
                      </td>
                    </tr>
                  ) : lancamentos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500">
                        Nenhum lançamento diário registrado para o mês {mesAtivo}. Clique em{' '}
                        <strong className="text-emerald-400 cursor-pointer" onClick={() => setShowNovoLancamento(true)}>
                          Novo Lançamento
                        </strong>{' '}
                        para alimentar os dados reais.
                      </td>
                    </tr>
                  ) : (
                    lancamentos.map(l => {
                      const gasto = Number(l.gasto_campanhas) || 0;
                      const lucro = Number(l.lucro_bruto) || 0;
                      const saldo = lucro - gasto;
                      return (
                        <tr key={l.id} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-300">
                            {l.data_lancamento}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-slate-300">
                              {l.categoria || 'Geral'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-200">{l.descricao || '—'}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-red-400">
                            R$ {formatarMoeda(gasto)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-semibold">
                            R$ {formatarMoeda(lucro)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-bold ${
                              saldo >= 0 ? 'text-cyan-300' : 'text-red-400'
                            }`}
                          >
                            {saldo >= 0 ? '+' : ''} R$ {formatarMoeda(saldo)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteLancamento(l.id)}
                              className="text-slate-500 hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
                              title="Excluir Lançamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* SUB-ABA 2: FATURAS E RECIBOS EM PDF DO META ADS */}
      {subAba === 'faturas' && (
        <div className="space-y-6">
          {/* Card Resumo de Faturas PDF */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel rounded-2xl p-5 border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-transparent">
              <span className="text-[11px] text-cyan-400 uppercase tracking-wider font-bold">
                Total Gasto em Faturas Meta
              </span>
              <div className="text-2xl font-heading font-extrabold text-white mt-1">
                R$ {formatarMoeda(despesasResumo?.totalGasto)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 inline-block">
                Soma de todos os recibos e faturas arquivadas
              </span>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-white/[0.08]">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                Total de Faturas / Recibos
              </span>
              <div className="text-2xl font-heading font-extrabold text-cyan-300 mt-1">
                {despesasResumo?.totalFaturas || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 inline-block">
                Média por fatura: R$ {formatarMoeda(despesasResumo?.mediaPorFatura)}
              </span>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-white/[0.08]">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                Maior Fatura Registrada
              </span>
              <div className="text-2xl font-heading font-extrabold text-emerald-400 mt-1">
                R$ {formatarMoeda(despesasResumo?.maiorDespesa)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 inline-block">
                Recibo com maior volume financeiro
              </span>
            </div>
          </div>

          {/* Tabela de Faturas PDF */}
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Histórico de Faturas & Recibos em PDF ({despesasResumo?.itens?.length || 0})
                </h3>
                <p className="text-xs text-slate-400">
                  Arquivos físicos originais das faturas do Meta Ads com comprovação contábil
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => api.exportarDespesasPdfCsv(filtroDataInicio, filtroDataFim)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold border border-white/10 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Exportar CSV</span>
                </button>
                <button
                  onClick={() => setShowUploadPdfModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir PDF</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.06] bg-white/[0.01]">
                  <tr>
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Descrição / Referência</th>
                    <th className="py-2.5 px-3">Conta / Pagamento</th>
                    <th className="py-2.5 px-3">Arquivo Original</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {carregandoFaturas ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        Carregando faturas PDF...
                      </td>
                    </tr>
                  ) : !despesasResumo?.itens || despesasResumo.itens.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-500">
                        Nenhuma fatura PDF cadastrada. Clique em{' '}
                        <strong className="text-cyan-400 cursor-pointer" onClick={() => setShowUploadPdfModal(true)}>
                          Subir PDF
                        </strong>{' '}
                        para cadastrar um recibo de Meta Ads.
                      </td>
                    </tr>
                  ) : (
                    despesasResumo.itens.map(f => (
                      <tr key={f.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-300">
                          {f.data_despesa}
                        </td>
                        <td className="py-2.5 px-3 text-white font-medium">{f.descricao}</td>
                        <td className="py-2.5 px-3 text-slate-400">
                          <span>{f.conta_anuncio || 'Meta Ads'}</span>
                          {f.metodo_pagamento && (
                            <span className="text-[10px] text-slate-500 block">
                              {f.metodo_pagamento}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-cyan-400 max-w-[200px] truncate" title={f.nome_arquivo}>
                          {f.nome_arquivo}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-red-400 font-bold">
                          R$ {formatarMoeda(f.valor)}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                          <a
                            href={`/api/bot/financas/despesas/pdf/${f.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-slate-400 hover:text-cyan-400 p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                            title="Visualizar PDF"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`/api/bot/financas/despesas/download/${f.id}`}
                            className="inline-flex items-center text-slate-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleDeleteDespesa(f.id)}
                            className="inline-flex items-center text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
                            title="Excluir Fatura"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 3: PLANILHAS SEMANAIS DO META ADS */}
      {subAba === 'planilhas' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                  Relatórios Semanais de Campanhas Meta Ads ({uploadsPlanilhas.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Planilhas exportadas do Gerenciador de Anúncios com consolidação automática de métricas de tráfego
                </p>
              </div>

              <label className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 cursor-pointer self-start sm:self-auto">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingPlanilha ? 'Processando Planilha...' : 'Subir Relatório XLSX / CSV'}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleUploadPlanilha}
                  className="hidden"
                  disabled={uploadingPlanilha}
                />
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.06] bg-white/[0.01]">
                  <tr>
                    <th className="py-2.5 px-3">Semana / Rótulo</th>
                    <th className="py-2.5 px-3">Mês Ref.</th>
                    <th className="py-2.5 px-3">Arquivo</th>
                    <th className="py-2.5 px-3 text-right">Leads Gerados</th>
                    <th className="py-2.5 px-3 text-right">Custo p/ Lead</th>
                    <th className="py-2.5 px-3 text-right">Gasto Total</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {carregandoPlanilhas ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        Carregando planilhas...
                      </td>
                    </tr>
                  ) : uploadsPlanilhas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500">
                        Nenhuma planilha semanal arquivada para o mês {mesAtivo}. Exporte o relatório do Meta Ads
                        em XLSX e faça o upload acima.
                      </td>
                    </tr>
                  ) : (
                    uploadsPlanilhas.map(p => (
                      <tr key={p.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-semibold text-white">{p.semana_rotulo}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{p.mes_referencia}</td>
                        <td className="py-2.5 px-3 font-mono text-indigo-400 max-w-[200px] truncate" title={p.nome_arquivo}>
                          {p.nome_arquivo}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-300">
                          {p.leads_gerados || 0}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          R$ {formatarMoeda(p.cpc_medio)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-red-400 font-bold">
                          R$ {formatarMoeda(p.gasto_total)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={async () => {
                              if (confirm('Excluir esta planilha arquivada?')) {
                                await api.deleteUploadPlanilha(p.id);
                                carregarPlanilhas(mesAtivo);
                              }
                            }}
                            className="text-slate-500 hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Planilha"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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

      {/* MODAL: SUBIR FATURA PDF DO META ADS */}
      {showUploadPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel rounded-2xl p-6 border border-white/15 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Cadastrar Fatura PDF do Meta Ads
              </h3>
              <button
                onClick={() => setShowUploadPdfModal(false)}
                className="text-slate-400 hover:text-white p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadPdf} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Arquivo da Fatura (.PDF)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={e => setPdfFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  O sistema extrai automaticamente o valor, data e identificador do recibo caso você não preencha.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Data (Opcional)
                  </label>
                  <input
                    type="date"
                    value={pdfData}
                    onChange={e => setPdfData(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Valor R$ (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 380,50"
                    value={pdfValor}
                    onChange={e => setPdfValor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrição / Referência (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Recibo Meta Ads #123456789"
                  value={pdfDescricao}
                  onChange={e => setPdfDescricao(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowUploadPdfModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                  disabled={uploadingPdf}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadingPdf}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                >
                  {uploadingPdf ? 'Processando...' : 'Arquivar Fatura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
