import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Upload,
  Plus,
  Trash2,
  Calendar,
  Sparkles
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
import type { BalancoFinanceiro, LancamentoDiario } from '../types/index.ts';
import { api } from '../services/api.ts';

export const FinancasView: React.FC = () => {
  const [meses, setMeses] = useState<string[]>([]);
  const [mesAtivo, setMesAtivo] = useState('');
  const [balanco, setBalanco] = useState<BalancoFinanceiro | null>(null);
  const [lancamentos, setLancamentos] = useState<LancamentoDiario[]>([]);

  // Modal Novo Lançamento
  const [showNovoLancamento, setShowNovoLancamento] = useState(false);
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoTipo, setNovoTipo] = useState('receita');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');

  // Upload Arquivos
  const [uploading, setUploading] = useState(false);

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
      setMeses(lista);
      const atual = new Date().toISOString().slice(0, 7);
      setMesAtivo(lista.includes(atual) ? atual : lista[0] || atual);
    } catch {
      // Ignorar
    }
  };

  const carregarBalancoELancamentos = async (mes: string) => {
    try {
      const [bal, lancs] = await Promise.all([
        api.getBalanco(mes).catch(() => null),
        api.getLancamentos(mes).catch(() => [])
      ]);
      setBalanco(bal);
      setLancamentos(lancs);
    } catch {
      // Ignorar
    }
  };

  const handleAddLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaDescricao || !novoValor) return alert('Preencha os campos!');
    try {
      await api.addLancamento({
        data: novaData,
        tipo: novoTipo,
        descricao: novaDescricao,
        valor: parseFloat(novoValor.replace(',', '.'))
      });
      setShowNovoLancamento(false);
      setNovaDescricao('');
      setNovoValor('');
      carregarBalancoELancamentos(mesAtivo);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao adicionar lançamento');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mes', mesAtivo);

    setUploading(true);
    try {
      const res = await api.uploadFatura(formData);
      alert(res.message || 'Arquivo processado com sucesso!');
      carregarBalancoELancamentos(mesAtivo);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha no upload');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const chartData = [
    {
      nome: 'Faturamento',
      valor: balanco?.faturamento_bruto || 0,
      fill: '#10b981'
    },
    {
      nome: 'Meta Ads',
      valor: balanco?.gastos_meta_ads || 0,
      fill: '#ef4444'
    },
    {
      nome: 'Operacional',
      valor: balanco?.gastos_operacionais || 0,
      fill: '#f59e0b'
    },
    {
      nome: 'Lucro Líquido',
      valor: Math.max(0, balanco?.lucro_liquido || 0),
      fill: '#00e5ff'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Finanças & DRE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900/80 border border-emerald-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
              Balanço Financeiro & DRE Meta Ads
            </h2>
            <p className="text-xs text-slate-400">
              Controle contábil automático com cálculo da Regra dos 70% de Reinvestimento e importação de faturas.
            </p>
          </div>
        </div>

        {/* Seletor de Mês & Ações */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={mesAtivo}
              onChange={e => setMesAtivo(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              {meses.map(m => (
                <option key={m} value={m} className="bg-[#0d1527] text-white">
                  Mês {m}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-semibold cursor-pointer border border-white/10 transition-all">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>{uploading ? 'Importando...' : 'Subir Fatura / XLSX'}</span>
            <input
              type="file"
              accept=".pdf,.xlsx,.csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>

          <button
            onClick={() => setShowNovoLancamento(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/25 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Grid de KPIs do DRE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento Bruto */}
        <div className="glass-panel rounded-2xl p-5 border border-white/[0.08]">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Faturamento Bruto</span>
          <div className="text-2xl font-heading font-extrabold text-white mt-1">
            R$ {(balanco?.faturamento_bruto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 inline-block">Comissões ML + Vendas</span>
        </div>

        {/* Card 2: Meta Ads */}
        <div className="glass-panel rounded-2xl p-5 border border-white/[0.08]">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Investimento Meta Ads</span>
          <div className="text-2xl font-heading font-extrabold text-red-400 mt-1">
            R$ {(balanco?.gastos_meta_ads || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 inline-block">
            ROAS: {(balanco?.roas || 0).toFixed(2)}x
          </span>
        </div>

        {/* Card 3: Lucro Líquido */}
        <div className="glass-panel rounded-2xl p-5 border border-white/[0.08]">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Lucro Líquido</span>
          <div className="text-2xl font-heading font-extrabold text-cyan-400 mt-1">
            R$ {(balanco?.lucro_liquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 inline-block">
            ROI: {(balanco?.roi_percentual || 0).toFixed(1)}%
          </span>
        </div>

        {/* Card 4: Regra 70% Reinvestimento */}
        <div className="glass-panel rounded-2xl p-5 border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 to-transparent">
          <span className="text-xs text-cyan-300 uppercase tracking-wider font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Regra 70% Reinvestir
          </span>
          <div className="text-2xl font-heading font-extrabold text-white mt-1">
            R$ {(balanco?.reinvestimento_sugerido_70 || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 inline-block">
            Retirada livre (30%): R$ {(balanco?.retirada_liquida_30 || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Gráfico do DRE Comparativo */}
      <div className="glass-panel rounded-2xl p-6 border border-white/[0.08]">
        <h3 className="font-heading font-bold text-white text-base mb-1 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Demonstrativo de Resultado do Exercício (DRE)
        </h3>
        <p className="text-xs text-slate-400 mb-6">Comparativo de entradas, despesas e margem líquida</p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="nome" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
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

      {/* Tabela de Lançamentos do Mês */}
      <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
        <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          Extrato Detalhado de Lançamentos ({lancamentos.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.06]">
              <tr>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Descrição</th>
                <th className="py-2.5 px-3 text-right">Valor</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {lancamentos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    Nenhum lançamento registrado neste mês.
                  </td>
                </tr>
              ) : (
                lancamentos.map(l => (
                  <tr key={l.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{l.data}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          l.tipo === 'receita'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : l.tipo === 'despesa_meta'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {l.tipo === 'receita'
                          ? 'Receita'
                          : l.tipo === 'despesa_meta'
                          ? 'Meta Ads'
                          : 'Operacional'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">{l.descricao}</td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold ${
                        l.tipo === 'receita' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {l.tipo === 'receita' ? '+' : '-'} R${' '}
                      {l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={async () => {
                          if (confirm('Excluir este lançamento?')) {
                            await api.deleteLancamento(l.id);
                            carregarBalancoELancamentos(mesAtivo);
                          }
                        }}
                        className="text-slate-500 hover:text-red-400"
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

      {/* Modal Novo Lançamento */}
      {showNovoLancamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel rounded-2xl p-6 border border-white/10 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h4 className="font-heading font-bold text-white text-sm">Adicionar Lançamento Contábil</h4>
              <button onClick={() => setShowNovoLancamento(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLancamento} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Data:</label>
                <input
                  type="date"
                  value={novaData}
                  onChange={e => setNovaData(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Tipo:</label>
                <select
                  value={novoTipo}
                  onChange={e => setNovoTipo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0d1527] border border-white/[0.08] text-white focus:outline-none"
                >
                  <option value="receita">Receita / Comissão</option>
                  <option value="despesa_meta">Despesa Meta Ads</option>
                  <option value="despesa_operacional">Despesa Operacional</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Descrição:</label>
                <input
                  type="text"
                  placeholder="Ex: Comissões Semana 3 - ML"
                  value={novaDescricao}
                  onChange={e => setNovaDescricao(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Valor (R$):</label>
                <input
                  type="text"
                  placeholder="Ex: 850,00"
                  value={novoValor}
                  onChange={e => setNovoValor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNovoLancamento(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/25"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
