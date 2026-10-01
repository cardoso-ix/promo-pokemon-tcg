import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  TrendingUp,
  Users,
  RefreshCw,
  ExternalLink,
  Calendar,
  XCircle,
  Tag,
  Layers,
  MapPin,
  PieChart as PieIcon,
  Search,
  CheckCircle2,
  AlertTriangle,
  Copy,
  SlidersHorizontal,
  Package,
  Percent,
  Coins,
  ShoppingCart,
  ShieldAlert,
  Trophy,
  Target,
  BarChart3
} from 'lucide-react';
import {
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ComposedChart,
  Line
} from 'recharts';
import type { MeliAffiliateOverview } from '../types/index.ts';
import { api } from '../services/api.ts';

interface MeliAfiliadosViewProps {
  onOpenCookieModal: () => void;
}

export const MeliAfiliadosView: React.FC<MeliAfiliadosViewProps> = ({ onOpenCookieModal }) => {
  const [activeTab, setActiveTab] = useState<
    'produtos' | 'audiencias' | 'nao_efetivadas' | 'data' | 'vendas' | 'categorias' | 'etiquetas'
  >('produtos');

  const [data, setData] = useState<MeliAffiliateOverview | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'units' | 'sales' | 'earnings'>('units');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalAjusteAberto, setModalAjusteAberto] = useState(false);
  const [salvandoAjuste, setSalvandoAjuste] = useState(false);
  const [formAjuste, setFormAjuste] = useState({
    commissionsToday: '8.46',
    ordersToday: '1',
    totalSalesToday: '85.98',
    clicksToday: '62',
    productsEstimatedToday: '2',
    unrealizedSalesToday: '0'
  });
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [unrealizedImgErrors, setUnrealizedImgErrors] = useState<Record<string, boolean>>({});

  const carregarMetricas = async (refresh = false) => {
    try {
      if (refresh) setSyncing(true);
      const res = await api.getMeliAffiliateMetrics(refresh);
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err: unknown) {
      console.warn('Erro ao carregar métricas:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    carregarMetricas();
    const interval = setInterval(() => carregarMetricas(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await api.syncAll();
      if (res.affiliate?.data) {
        setData(res.affiliate.data);
      } else {
        await carregarMetricas(true);
      }
      mostrarFeedback('Sincronização com o Mercado Livre concluída com sucesso!');
    } catch {
      mostrarFeedback('Erro ao sincronizar. Verifique se o cookie de sessão está ativo.');
    } finally {
      setSyncing(false);
    }
  };

  const mostrarFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCopiarLink = (link: string) => {
    navigator.clipboard.writeText(link);
    mostrarFeedback('Link comissionado copiado para a área de transferência!');
  };

  const abrirModalAjuste = () => {
    setFormAjuste({
      commissionsToday: String(data?.commissionsToday ?? 8.46),
      ordersToday: String(data?.ordersToday ?? 1),
      totalSalesToday: String(data?.totalSalesToday ?? 85.98),
      clicksToday: String(data?.clicksToday ?? 62),
      productsEstimatedToday: String(data?.productsEstimatedToday ?? 2),
      unrealizedSalesToday: String(data?.unrealizedSalesToday ?? 0)
    });
    setModalAjusteAberto(true);
  };

  const handleSalvarAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoAjuste(true);
    try {
      const res = await api.saveMeliAffiliateManual({
        commissionsToday: parseFloat(formAjuste.commissionsToday.replace(',', '.')) || 0,
        ordersToday: parseInt(formAjuste.ordersToday, 10) || 0,
        totalSalesToday: parseFloat(formAjuste.totalSalesToday.replace(',', '.')) || 0,
        clicksToday: parseInt(formAjuste.clicksToday, 10) || 0,
        productsEstimatedToday: parseInt(formAjuste.productsEstimatedToday, 10) || 0,
        unrealizedSalesToday: parseInt(formAjuste.unrealizedSalesToday, 10) || 0
      });
      if (res.data) {
        setData(res.data);
      }
      setModalAjusteAberto(false);
      mostrarFeedback('Métricas de hoje atualizadas com sucesso no Dashboard e Finanças!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar';
      mostrarFeedback(`Erro: ${msg}`);
    } finally {
      setSalvandoAjuste(false);
    }
  };

  // Filtragem e ordenação dos produtos
  const produtosFiltrados = (data?.productsSold || [])
    .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'units') return b.unitsSold - a.unitsSold;
      if (sortBy === 'sales') return b.totalSales - a.totalSales;
      if (sortBy === 'earnings') return b.estimatedEarnings - a.estimatedEarnings;
      return 0;
    });

  const totalComissoes = data?.totalCommissions || 0;
  const comissoesHoje = data?.commissionsToday || 0;
  const totalVendas = data?.totalSales || 0;
  const totalCliques = data?.totalClicks || 0;
  const cvr = (data?.cvr || 0) * 100;
  const pedidosHoje = data?.ordersToday || 0;
  const totalPedidos = data?.totalOrders || 0;

  // Novos KPIs de Ouro (Opção 1)
  const cliquesHoje = data?.clicksToday || 0;
  const epcHoje = data?.epcToday ?? (cliquesHoje > 0 ? (comissoesHoje / cliquesHoje) : 0);
  const aovHoje = data?.aovToday ?? (pedidosHoje > 0 ? ((data?.totalSalesToday || 0) / pedidosHoje) : 0);
  const taxaComissaoEfetiva = data?.effectiveCommissionRateToday ?? (data?.totalSalesToday && data.totalSalesToday > 0 ? ((comissoesHoje / data.totalSalesToday) * 100) : 0);
  const cestaMedia = data?.basketMultiplierToday ?? (pedidosHoje > 0 && data?.productsEstimatedToday ? (data.productsEstimatedToday / pedidosHoje) : 1);
  const produtosEstimadosHoje = data?.productsEstimatedToday ?? 0;
  const vendasNaoEfetivadasHoje = data?.unrealizedSalesToday ?? (data?.unrealizedSales?.length || 0);

  // Inteligência e Gráfico da Aba Data (Desempenho Diário)
  const dailyDataSortedDesc = [...(data?.dailyData || [])].sort((a, b) => b.date.localeCompare(a.date));
  const dailyDataChart = [...(data?.dailyData || [])]
    .filter(d => d.earnings > 0 || d.orders > 0 || d.touchpoints > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      dataLabel: d.date.length > 5 ? d.date.slice(5) : d.date,
      dataCompleta: d.date,
      comissoes: d.earnings,
      pedidos: d.orders,
      itens: d.quantity,
      cliques: d.touchpoints,
      cvrPercentual: Number((d.cvr * 100).toFixed(1))
    }));

  const melhorDiaRegistro = [...(data?.dailyData || [])].reduce(
    (max, cur) => (cur.earnings > (max?.earnings || 0) ? cur : max),
    null as { date: string; earnings: number; orders: number; quantity: number } | null
  );

  const diasComComissao = (data?.dailyData || []).filter(d => d.earnings > 0);
  const mediaComissaoDiaria = diasComComissao.length > 0
    ? diasComComissao.reduce((acc, d) => acc + d.earnings, 0) / diasComComissao.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Toast de Feedback */}
      {feedback && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/90 text-slate-950 font-semibold text-xs shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Banner / Header Executivo da Aba de Afiliados */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-amber-500/25 bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-yellow-950/30 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xl shadow-inner">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
                  Mercado Livre Afiliados · Inteligência de Vendas
                </h2>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Tag Oficial: {data?.tag || 'caed1312314'}
                </span>
                {data?.sessionExpired && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Sessão expirada
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Painel analítico completo integrado ao Portal de Afiliados do Mercado Livre. Acompanhe produtos mais vendidos, audiência demográfica, faturamento diário e vendas perdidas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-center flex-wrap">
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
            </button>

            <button
              onClick={onOpenCookieModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all"
            >
              <span>Renovar Cookie</span>
            </button>

            <button
              onClick={abrirModalAjuste}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all"
              title="Ajustar ou sincronizar manualmente os números de hoje"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Ajustar Hoje</span>
            </button>
          </div>
        </div>

        {/* 4 KPIs de Alto Impacto */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/[0.08]">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Comissões no Mês</span>
            <p className="text-xl font-heading font-extrabold text-amber-400 mt-1">
              R$ {totalComissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-emerald-400">Total acumulado ({totalPedidos} vendas)</span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Comissões Hoje</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <p className="text-xl font-heading font-extrabold text-white">
                R$ {comissoesHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-cyan-300">({pedidosHoje} hoje)</span>
            </div>
            <span className="text-[10px] text-slate-400">Ganhos em tempo real</span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Vendas Brutas Geradas</span>
            <p className="text-xl font-heading font-extrabold text-white mt-1">
              R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400">Volume enviado ao Mercado Livre</span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Cliques & Conversão</span>
            <p className="text-xl font-heading font-extrabold text-emerald-400 mt-1">
              {totalCliques.toLocaleString('pt-BR')} <span className="text-xs text-slate-400 font-normal">cliques</span>
            </p>
            <span className="text-[10px] text-emerald-400 font-medium">Taxa de Conversão: {cvr.toFixed(2)}%</span>
          </div>
        </div>

        {/* Barra de KPIs de Ouro de Afiliados (Opção 1) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-white/[0.06]">
          {/* 1. EPC Hoje */}
          <div className="p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">EPC Hoje</span>
              <Coins className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-1.5">
              <p className="text-lg font-heading font-extrabold text-amber-300">
                R$ {epcHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </p>
              <span className="text-[9px] text-slate-400">Ganho médio / clique</span>
            </div>
          </div>

          {/* 2. Ticket Médio (AOV) */}
          <div className="p-3 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">Ticket Médio (AOV)</span>
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="mt-1.5">
              <p className="text-lg font-heading font-extrabold text-cyan-300">
                R$ {aovHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[9px] text-slate-400">Venda média / pedido</span>
            </div>
          </div>

          {/* 3. Comissão Real % */}
          <div className="p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Comissão Real %</span>
              <Percent className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1.5">
              <p className="text-lg font-heading font-extrabold text-emerald-300">
                {taxaComissaoEfetiva.toFixed(2)}%
              </p>
              <span className="text-[9px] text-slate-400">Take-rate efetivo</span>
            </div>
          </div>

          {/* 4. Cesta Média */}
          <div className="p-3 rounded-xl bg-purple-500/[0.06] border border-purple-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Cesta Média</span>
              <ShoppingCart className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="mt-1.5">
              <p className="text-lg font-heading font-extrabold text-purple-300">
                {cestaMedia.toFixed(1)} <span className="text-xs text-slate-400 font-normal">itens</span>
              </p>
              <span className="text-[9px] text-slate-400">Média de itens / pedido</span>
            </div>
          </div>

          {/* 5. Produtos Estimados */}
          <div className="p-3 rounded-xl bg-blue-500/[0.06] border border-blue-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Prod. Estimados</span>
              <Package className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="mt-1.5">
              <p className="text-lg font-heading font-extrabold text-blue-300">
                {produtosEstimadosHoje} <span className="text-xs text-slate-400 font-normal">un</span>
              </p>
              <span className="text-[9px] text-slate-400">Itens em pedidos hoje</span>
            </div>
          </div>

          {/* 6. Vendas Não Efetivadas */}
          <div className="p-3 rounded-xl bg-rose-500/[0.06] border border-rose-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-rose-300 font-bold uppercase tracking-wider">Não Efetivadas</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="mt-1.5">
              <p className="text-lg font-heading font-extrabold text-rose-300">
                {vendasNaoEfetivadasHoje} <span className="text-xs text-slate-400 font-normal">tentativas</span>
              </p>
              <span className="text-[9px] text-slate-400">Não pagas / canceladas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Sessão Expirada com Ação Rápida */}
      {data?.sessionExpired && (
        <div className="glass-panel rounded-2xl p-4 border border-amber-500/40 bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-white">Sessão do Mercado Livre expirada</p>
              <p className="text-slate-300 text-[11px] mt-0.5">
                Para atualizar os dados ao vivo sem atraso, cole o cookie recente da sua conta do Mercado Livre ou ajuste manualmente os números de hoje.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenCookieModal}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-all text-xs shadow-sm"
            >
              Renovar Cookie
            </button>
            <button
              onClick={abrirModalAjuste}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white font-medium hover:bg-white/15 transition-all text-xs border border-white/10"
            >
              Ajustar Hoje
            </button>
          </div>
        </div>
      )}

      {/* Navegação por Sub-Abas (Exatamente como no Mercado Livre) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-white/[0.08] scrollbar-none">
        <button
          onClick={() => setActiveTab('produtos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'produtos'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Produtos vendidos</span>
          {data?.productsSold && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-200">
              {data.productsSold.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('audiencias')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'audiencias'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Audiências (Idade, Gênero & UF)</span>
        </button>

        <button
          onClick={() => setActiveTab('nao_efetivadas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'nao_efetivadas'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Vendas não efetivadas</span>
          {data?.unrealizedSales && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/30 text-red-200">
              {data.unrealizedSales.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('data')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'data'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Data (Desempenho Diário)</span>
        </button>

        <button
          onClick={() => setActiveTab('vendas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'vendas'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Vendas (Histórico)</span>
        </button>

        <button
          onClick={() => setActiveTab('categorias')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'categorias'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Categorias</span>
        </button>

        <button
          onClick={() => setActiveTab('etiquetas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'etiquetas'
              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Etiquetas de rastreamento</span>
        </button>
      </div>

      {/* Conteúdo da Sub-Aba 1: PRODUTOS VENDIDOS */}
      {activeTab === 'produtos' && (
        <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden space-y-4 p-5">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar produto por nome ou código..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500/60"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500/60"
              >
                <option value="units">Unidades Vendidas (Maior)</option>
                <option value="sales">Volume de Vendas (R$)</option>
                <option value="earnings">Comissão Estimada (R$)</option>
              </select>
            </div>
          </div>

          {/* Tabela de Produtos Vendidos */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Produtos</th>
                  <th className="py-3 px-4 text-center">Unidades vendidas</th>
                  <th className="py-3 px-4 text-right">Vendas</th>
                  <th className="py-3 px-4 text-center">Ganhos (%)</th>
                  <th className="py-3 px-4 text-right">Ganho estimado</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {produtosFiltrados.map(prod => (
                  <tr key={prod.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {prod.image && !imgErrors[prod.id] ? (
                          <img
                            src={prod.image}
                            alt={prod.title}
                            referrerPolicy="no-referrer"
                            onError={() => setImgErrors(prev => ({ ...prev, [prod.id]: true }))}
                            className="w-11 h-11 rounded-lg object-contain bg-white/5 border border-white/10 p-1 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-200 line-clamp-2 text-xs leading-snug" title={prod.title}>
                            {prod.title}
                          </p>
                          <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
                            ID: {prod.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg font-bold font-heading text-white bg-white/[0.05] border border-white/10">
                        {prod.unitsSold}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-medium text-slate-200 whitespace-nowrap">
                      R$ {prod.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {prod.commissionRate}%
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-heading font-extrabold text-emerald-400 whitespace-nowrap">
                      +R$ {prod.estimatedEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleCopiarLink(prod.permalink)}
                          title="Copiar Link de Afiliado"
                          className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1 text-[11px]"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </button>
                        <a
                          href={prod.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ver Anúncio no Mercado Livre"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo da Sub-Aba 2: AUDIÊNCIAS (Idade, Gênero, Localização) */}
      {activeTab === 'audiencias' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Faixa Etária */}
            <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-4">
              <div className="flex items-center gap-2 text-cyan-300 border-b border-white/[0.06] pb-3">
                <Users className="w-4 h-4 text-cyan-400" />
                <h3 className="font-heading font-bold text-sm text-white">Faixa de Idade dos Compradores</h3>
              </div>
              <div className="space-y-3">
                {(data?.audience?.ageGroups || []).map((ag, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{ag.range}</span>
                      <span className="text-cyan-400 font-bold">{ag.percentage}% ({ag.buyers} compradores)</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                        style={{ width: `${ag.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: Gênero */}
            <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-4">
              <div className="flex items-center gap-2 text-purple-300 border-b border-white/[0.06] pb-3">
                <PieIcon className="w-4 h-4 text-purple-400" />
                <h3 className="font-heading font-bold text-sm text-white">Distribuição por Gênero</h3>
              </div>
              <div className="space-y-3">
                {(data?.audience?.gender || []).map((g, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{g.label}</span>
                      <span className="text-purple-400 font-bold">{g.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                        style={{ width: `${g.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2 text-[11px] text-slate-400 leading-relaxed">
                Público majoritariamente colecionador jovem-adulto e entusiastas de Pokémon TCG competitivo.
              </div>
            </div>

            {/* Card 3: Localização por Estado (UF) */}
            <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-4">
              <div className="flex items-center gap-2 text-emerald-300 border-b border-white/[0.06] pb-3">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <h3 className="font-heading font-bold text-sm text-white">Top Localizações (Estados / UF)</h3>
              </div>
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {(data?.audience?.locations || []).map((loc, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-[11px] flex items-center justify-center font-mono">
                        {loc.state}
                      </span>
                      <span className="text-slate-200 font-medium">{loc.stateName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-400 block">{loc.percentage}%</span>
                      <span className="text-[10px] text-slate-500">{loc.orders} pedidos</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Sub-Aba 3: VENDAS NÃO EFETIVADAS (Perdidas) */}
      {activeTab === 'nao_efetivadas' && (
        <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                Vendas Não Efetivadas & Oportunidades Perdidas
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pedidos gerados através do seu link que não geraram comissão (boletos não pagos, cartões recusados ou compras canceladas).
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold font-mono">
              Comissão Perdida: ~R${' '}
              {(data?.unrealizedSales || []).reduce((acc, i) => acc + i.estimatedLostCommission, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4 text-center">Unidades</th>
                  <th className="py-3 px-4 text-right">Valor da Venda</th>
                  <th className="py-3 px-4 text-right">Comissão Perdida</th>
                  <th className="py-3 px-4">Motivo da Não Efetivação</th>
                  <th className="py-3 px-4 text-center">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {(data?.unrealizedSales || []).map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {item.image && !unrealizedImgErrors[item.id] ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            onError={() => setUnrealizedImgErrors(prev => ({ ...prev, [item.id]: true }))}
                            className="w-10 h-10 rounded-lg object-contain bg-white/5 border border-white/10 p-1 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <span className="font-medium text-slate-200 line-clamp-2 max-w-sm">
                          {item.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-white">{item.units}</td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      R$ {item.lostSalesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-red-400">
                      -R$ {item.estimatedLostCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-300 border border-red-500/20 inline-block">
                        {item.reason}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                      {item.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo da Sub-Aba 4: DATA (Detalhamento Diário com Inteligência Visual) */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          {/* 3 Mini-Cards de Inteligência Estratégica */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Mini-Card 1: Recorde / Melhor Dia */}
            <div className="glass-panel p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent relative overflow-hidden group hover:border-amber-500/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Recorde do Mês
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">
                  {melhorDiaRegistro ? melhorDiaRegistro.date : 'N/A'}
                </span>
              </div>
              <div className="mt-2.5">
                <div className="text-xl sm:text-2xl font-heading font-extrabold text-amber-400">
                  R$ {melhorDiaRegistro ? melhorDiaRegistro.earnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                </div>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                  <span>🎯 {melhorDiaRegistro ? melhorDiaRegistro.orders : 0} pedidos confirmados</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{melhorDiaRegistro ? melhorDiaRegistro.quantity : 0} itens</span>
                </p>
              </div>
            </div>

            {/* Mini-Card 2: Média Diária */}
            <div className="glass-panel p-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent relative overflow-hidden group hover:border-cyan-500/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  Média Diária Ativa
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
                  {diasComComissao.length} dias c/ vendas
                </span>
              </div>
              <div className="mt-2.5">
                <div className="text-xl sm:text-2xl font-heading font-extrabold text-cyan-300">
                  R$ {mediaComissaoDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Receita comissionada média por dia de faturamento
                </p>
              </div>
            </div>

            {/* Mini-Card 3: Conversão Global CVR */}
            <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent relative overflow-hidden group hover:border-emerald-500/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-400" />
                  Conversão Geral (CVR)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                  {totalPedidos} vendas totais
                </span>
              </div>
              <div className="mt-2.5">
                <div className="text-xl sm:text-2xl font-heading font-extrabold text-emerald-400">
                  {cvr.toFixed(2)}%
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Taxa de conversão sobre {totalCliques.toLocaleString('pt-BR')} cliques rastreados
                </p>
              </div>
            </div>
          </div>

          {/* Gráfico Interativo de Tendência Diária */}
          <div className="glass-panel rounded-2xl border border-white/[0.08] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Tendência Diária: Comissões (R$) & Pedidos
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Acompanhe a curva diária de receita gerada e volume de vendas aprovadas
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50 inline-block" />
                  Comissão (R$)
                </span>
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-500/50 inline-block" />
                  Pedidos
                </span>
              </div>
            </div>

            {dailyDataChart.length > 0 ? (
              <div className="h-64 sm:h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyDataChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="comissaoAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="dataLabel"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val: number) => `R$ ${val}`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val: number) => `${val} vd`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const dataPoint = payload[0].payload as {
                            dataCompleta: string;
                            comissoes: number;
                            pedidos: number;
                            itens: number;
                            cliques: number;
                            cvrPercentual: number;
                          };
                          return (
                            <div className="rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-md p-3 shadow-2xl text-xs space-y-1.5 min-w-[180px]">
                              <p className="font-mono font-bold text-slate-200 border-b border-white/10 pb-1 flex items-center justify-between">
                                <span>📅 {dataPoint.dataCompleta}</span>
                                <span className="text-[10px] text-cyan-300 font-normal">{dataPoint.cvrPercentual}% CVR</span>
                              </p>
                              <div className="flex justify-between items-center text-emerald-400 font-bold pt-0.5">
                                <span>Comissões:</span>
                                <span>R$ {dataPoint.comissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center text-cyan-300">
                                <span>Pedidos Aprovados:</span>
                                <span className="font-bold">{dataPoint.pedidos} vendas</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                                <span>Itens Vendidos:</span>
                                <span>{dataPoint.itens} unid.</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                                <span>Cliques (Touchpoints):</span>
                                <span>{dataPoint.cliques}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="comissoes"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#comissaoAreaGrad)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="pedidos"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={{ r: 3.5, fill: '#06b6d4', stroke: '#0891b2', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#22d3ee', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                Aguardando dados históricos diários para geração do gráfico.
              </div>
            )}
          </div>

          {/* Tabela Detalhada com Badges e Destaques */}
          <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden space-y-4 p-5">
            <div className="border-b border-white/[0.06] pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  Histórico de Faturamento e Comissões por Data
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consolidação dia a dia com identificação automática do dia recorde
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {dailyDataSortedDesc.length} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] text-slate-400 font-semibold uppercase text-[11px]">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4 text-center">Pedidos</th>
                    <th className="py-3 px-4 text-center">Quantidade de Itens</th>
                    <th className="py-3 px-4 text-right">Comissões (R$)</th>
                    <th className="py-3 px-4 text-center">Cliques (Touchpoints)</th>
                    <th className="py-3 px-4 text-center">CVR (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {dailyDataSortedDesc.map((d, idx) => {
                    const isMelhorDia = melhorDiaRegistro && d.date === melhorDiaRegistro.date && d.earnings > 0;
                    return (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          isMelhorDia
                            ? 'bg-amber-500/10 hover:bg-amber-500/15 border-l-2 border-l-amber-400'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-medium text-slate-300 flex items-center gap-2">
                          <span>{d.date}</span>
                          {isMelhorDia && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-sm">
                              <Trophy className="w-3 h-3" /> Recorde
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-white">{d.orders}</td>
                        <td className="py-3 px-4 text-center text-slate-300">{d.quantity}</td>
                        <td className="py-3 px-4 text-right font-heading font-bold text-emerald-400">
                          R$ {d.earnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-400">{d.touchpoints}</td>
                        <td className="py-3 px-4 text-center text-cyan-300 font-medium">
                          {(d.cvr * 100).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Sub-Aba 5: VENDAS (Histórico Individual) */}
      {activeTab === 'vendas' && (
        <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden space-y-4 p-5">
          <div className="border-b border-white/[0.06] pb-3">
            <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Últimas Vendas Rastreadas pela Tag
            </h3>
          </div>

          <div className="space-y-2.5">
            {(data?.recentSales || []).map(s => (
              <div key={s.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-3">
                  {s.productImage && !imgErrors[s.id] ? (
                    <img
                      src={s.productImage}
                      alt={s.productName}
                      referrerPolicy="no-referrer"
                      onError={() => setImgErrors(prev => ({ ...prev, [s.id]: true }))}
                      className="w-12 h-12 rounded-lg object-contain bg-white/5 p-1 border border-white/10 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 flex-shrink-0">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-slate-200 text-xs line-clamp-1">{s.productName}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                      <span>Loja: {s.storeName}</span>
                      <span>•</span>
                      <span>Data: {s.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Venda Bruta</span>
                    <span className="font-bold text-white text-xs">
                      R$ {s.saleValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-400 block">Sua Comissão ({s.commissionPercentage}%)</span>
                    <span className="font-heading font-extrabold text-emerald-400 text-sm">
                      +R$ {s.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conteúdo da Sub-Aba 6: CATEGORIAS */}
      {activeTab === 'categorias' && (
        <div className="glass-panel rounded-2xl border border-white/[0.08] p-5 space-y-4">
          <div className="border-b border-white/[0.06] pb-3">
            <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              Desempenho por Categoria de Produto
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(data?.categories || []).map((cat, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <span className="text-xs font-bold text-slate-200 block">{cat.name}</span>
                <div className="flex items-baseline justify-between text-xs pt-1">
                  <span className="text-slate-400">Vendas Geradas:</span>
                  <span className="font-bold text-white">R$ {cat.sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-400">Comissão Gerada:</span>
                  <span className="font-bold text-emerald-400">+R$ {cat.earnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-1.5 rounded-full" style={{ width: `${cat.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conteúdo da Sub-Aba 7: ETIQUETAS DE RASTREAMENTO */}
      {activeTab === 'etiquetas' && (
        <div className="glass-panel rounded-2xl border border-white/[0.08] p-5 space-y-4">
          <div className="border-b border-white/[0.06] pb-3">
            <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-orange-400" />
              Etiquetas e Tags de Rastreamento Comissionadas
            </h3>
          </div>

          <div className="space-y-3">
            {(data?.trackingTags || []).map((tag, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-300 font-mono font-bold border border-orange-500/20">
                    {tag.tag}
                  </span>
                  <span className="text-slate-400">{tag.clicks} cliques</span>
                </div>
                <div className="flex items-center gap-5">
                  <span className="text-slate-300">Vendas: R$ {tag.sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span className="font-bold text-emerald-400">+R$ {tag.earnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Ajuste Manual de Hoje */}
      {modalAjusteAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel rounded-2xl p-6 border border-white/10 max-w-md w-full space-y-4 shadow-2xl bg-[#09101d]/95">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h4 className="font-heading font-bold text-white text-sm flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                Ajustar Métricas de Hoje (Mercado Livre)
              </h4>
              <button onClick={() => setModalAjusteAberto(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Confirme os valores conforme exibidos no seu painel oficial do Mercado Livre Afiliados. Esses números atualizam instantaneamente o Dashboard e o DRE Financeiro de hoje.
            </p>

            <form onSubmit={handleSalvarAjuste} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1 font-semibold">Ganho Estimado / Comissão Hoje (R$)</label>
                <input
                  type="text"
                  value={formAjuste.commissionsToday}
                  onChange={e => setFormAjuste({ ...formAjuste, commissionsToday: e.target.value })}
                  placeholder="Ex: 8.85"
                  className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1 font-semibold">Ordens Estimadas</label>
                  <input
                    type="number"
                    value={formAjuste.ordersToday}
                    onChange={e => setFormAjuste({ ...formAjuste, ordersToday: e.target.value })}
                    placeholder="Ex: 1"
                    className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1 font-semibold">Cliques Totais Hoje</label>
                  <input
                    type="number"
                    value={formAjuste.clicksToday}
                    onChange={e => setFormAjuste({ ...formAjuste, clicksToday: e.target.value })}
                    placeholder="Ex: 36"
                    className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1 font-semibold">Vendas Brutas Estimadas Hoje (R$)</label>
                <input
                  type="text"
                  value={formAjuste.totalSalesToday}
                  onChange={e => setFormAjuste({ ...formAjuste, totalSalesToday: e.target.value })}
                  placeholder="Ex: 85.98"
                  className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1 font-semibold">Produtos Estimados Hoje</label>
                  <input
                    type="number"
                    value={formAjuste.productsEstimatedToday}
                    onChange={e => setFormAjuste({ ...formAjuste, productsEstimatedToday: e.target.value })}
                    placeholder="Ex: 2"
                    className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1 font-semibold">Vendas Não Efetivadas</label>
                  <input
                    type="number"
                    value={formAjuste.unrealizedSalesToday}
                    onChange={e => setFormAjuste({ ...formAjuste, unrealizedSalesToday: e.target.value })}
                    placeholder="Ex: 0"
                    className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setModalAjusteAberto(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoAjuste}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/25 flex items-center gap-2 disabled:opacity-50"
                >
                  {salvandoAjuste ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{salvandoAjuste ? 'Salvando...' : 'Salvar & Aplicar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default MeliAfiliadosView;
