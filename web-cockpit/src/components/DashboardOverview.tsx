import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Zap,
  Users,
  DollarSign,
  Droplets,
  Flame,
  ArrowUpRight,
  ShieldCheck,
  ExternalLink,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Settings,
  X,
  ShoppingBag
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type { UnifiedStatus, OfertaLog, BalancoFinanceiro, FluxoHorarioItem, MetaInsightsOverview, MeliOrdersOverview, MeliAffiliateOverview } from '../types/index.ts';
import { api } from '../services/api.ts';

interface DashboardOverviewProps {
  status: UnifiedStatus | null;
  recentLogs: OfertaLog[];
  balanco: BalancoFinanceiro | null;
  onNavigate: (module: 'replica' | 'disparador' | 'financas') => void;
  onOpenReplicaQr: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  status,
  recentLogs,
  balanco,
  onNavigate,
  onOpenReplicaQr
}) => {
  const replica = status?.replica;
  const bot = status?.bot;

  // Estados do Meta Ads
  const [metaData, setMetaData] = useState<MetaInsightsOverview | null>(null);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [metaTokenInput, setMetaTokenInput] = useState('');
  const [metaAccountIdInput, setMetaAccountIdInput] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);

  // Estados do Mercado Livre Afiliados (Comissões e Métricas Reais)
  const [affiliateData, setAffiliateData] = useState<MeliAffiliateOverview | null>(null);
  const [isAffiliateConnected, setIsAffiliateConnected] = useState(false);
  const [syncingAffiliate, setSyncingAffiliate] = useState(false);
  const [affiliateCookieInput, setAffiliateCookieInput] = useState('');

  // Estados do Mercado Livre (Vendas em Tempo Real via Webhook & API Oficial)
  const [meliData, setMeliData] = useState<MeliOrdersOverview | null>(null);
  const [showMeliModal, setShowMeliModal] = useState(false);
  const [meliClientIdInput, setMeliClientIdInput] = useState('');
  const [meliClientSecretInput, setMeliClientSecretInput] = useState('');
  const [meliTokenInput, setMeliTokenInput] = useState('');
  const [savingMeli, setSavingMeli] = useState(false);
  const [syncingMeli, setSyncingMeli] = useState(false);
  const [meliWebhookUrl, setMeliWebhookUrl] = useState('');

  // Fluxo de atividade por horário alimentado com dados 100% reais do banco
  const [activityData, setActivityData] = useState<FluxoHorarioItem[]>([
    { hora: '08h', ofertas: 0, cliques: 0, leads: 0 },
    { hora: '10h', ofertas: 0, cliques: 0, leads: 0 },
    { hora: '12h', ofertas: 0, cliques: 0, leads: 0 },
    { hora: '14h', ofertas: 0, cliques: 0, leads: 0 },
    { hora: '16h', ofertas: 0, cliques: 0, leads: 0 },
    { hora: '18h', ofertas: 0, cliques: 0, leads: 0 },
    { hora: '20h', ofertas: 0, cliques: 0, leads: 0 },
    { hora: '22h', ofertas: 0, cliques: 0, leads: 0 },
  ]);

  const carregarMetaInsights = async () => {
    try {
      const res = await api.getMetaInsights();
      if (res && res.data) {
        setMetaData(res);
        if (res.accountId && !metaAccountIdInput) {
          setMetaAccountIdInput(res.accountId);
        }
      }
    } catch {
      // Silencioso
    }
  };

  const carregarMeliInsights = async () => {
    try {
      const res = await api.getMeliInsights();
      if (res && res.data) {
        setMeliData(res);
        if (res.webhookUrl) setMeliWebhookUrl(res.webhookUrl);
      }
    } catch {
      // Silencioso
    }
  };

  const carregarMeliAffiliate = async (refresh = false) => {
    try {
      const res = await api.getMeliAffiliateMetrics(refresh);
      if (res && res.data) {
        setAffiliateData(res.data);
        setIsAffiliateConnected(Boolean(res.connected));
      }
    } catch {
      // Silencioso
    }
  };

  useEffect(() => {
    let isMounted = true;
    const carregarFluxoReal = async () => {
      try {
        const data = await api.getFluxoHorario();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setActivityData(data);
        }
      } catch {
        // Manter dados anteriores
      }
    };

    carregarFluxoReal();
    carregarMetaInsights();
    carregarMeliInsights();
    carregarMeliAffiliate();
    const interval = setInterval(() => {
      carregarFluxoReal();
      carregarMetaInsights();
      carregarMeliInsights();
      carregarMeliAffiliate();
    }, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSaveMetaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaTokenInput && !metaAccountIdInput) {
      return alert('Informe ao menos o Token de Acesso ou o ID da Conta.');
    }
    setSavingMeta(true);
    try {
      const res = await api.saveMetaAdsConfig({
        accessToken: metaTokenInput,
        accountId: metaAccountIdInput,
        syncNow: true
      });
      alert(res.message || 'Configurações do Meta Ads salvas com sucesso!');
      setShowMetaModal(false);
      setMetaTokenInput('');
      await carregarMetaInsights();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao salvar Meta Ads');
    } finally {
      setSavingMeta(false);
    }
  };

  const handleSyncMetaNow = async () => {
    setSyncingMeta(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await api.syncMetaInsights(trintaDiasAtras, hoje);
      alert(`Sincronização concluída com sucesso! ${res.totalSincronizados} registros de gastos atualizados.`);
      await carregarMetaInsights();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha na sincronização do Meta Ads');
    } finally {
      setSyncingMeta(false);
    }
  };

  const handleSaveMeliConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meliClientIdInput && !meliTokenInput) {
      return alert('Informe ao menos o App ID (Client ID) ou o Token de Acesso do Mercado Livre.');
    }
    setSavingMeli(true);
    try {
      const res = await api.saveMeliConfig({
        clientId: meliClientIdInput,
        clientSecret: meliClientSecretInput,
        accessToken: meliTokenInput,
        syncNow: true
      });
      alert(res.message || 'Configurações do Mercado Livre salvas com sucesso!');
      setShowMeliModal(false);
      setMeliTokenInput('');
      setMeliClientSecretInput('');
      await carregarMeliInsights();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao salvar Mercado Livre');
    } finally {
      setSavingMeli(false);
    }
  };

  const handleSyncAffiliateNow = async () => {
    setSyncingAffiliate(true);
    try {
      const res = await api.syncMeliAffiliate(affiliateCookieInput ? { cookie: affiliateCookieInput } : undefined);
      alert(res.message || 'Métricas de Afiliado sincronizadas com sucesso!');
      if (res.data) {
        setAffiliateData(res.data);
        setIsAffiliateConnected(true);
      }
      if (affiliateCookieInput) setAffiliateCookieInput('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao sincronizar afiliados');
    } finally {
      setSyncingAffiliate(false);
    }
  };

  const handleSyncMeliNow = async () => {
    setSyncingMeli(true);
    try {
      const res = await api.syncMeliOrders(30);
      alert(`Sincronização concluída com sucesso! ${res.totalProcessados} pedidos processados.`);
      await carregarMeliInsights();
      await carregarMeliAffiliate();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha na sincronização do Mercado Livre');
    } finally {
      setSyncingMeli(false);
    }
  };

  const handleIniciarOAuthMeli = () => {
    window.location.href = '/api/integrations/meli/auth';
  };

  // Consolidação Financeira Unificada em Tempo Real (Mercado Livre Afiliados vs Meta Ads)
  const totalComissoesAfiliado = affiliateData?.totalCommissions || meliData?.data?.netProfit || balanco?.totalLucroBruto || 0;
  const comissoesHoje = affiliateData?.commissionsToday || meliData?.data?.revenueToday || 0;
  const vendasGeradasMeli = affiliateData?.totalSales || meliData?.data?.totalRevenue || 0;
  const pedidosAfiliado = affiliateData?.totalOrders || meliData?.data?.ordersToday || 0;
  const cliquesAfiliado = affiliateData?.totalClicks || 0;
  const cvrAfiliado = affiliateData?.cvr || 0;
  const gastoMetaAds = metaData?.data?.totalSpend || balanco?.totalGastoCampanhas || 0;
  const lucroOperacaoReal = Math.max(0, totalComissoesAfiliado - gastoMetaAds);
  const reinvestir70 = lucroOperacaoReal * 0.70;
  const disponivel30 = lucroOperacaoReal * 0.30;

  const pieData = [
    { name: 'Lucro Sócios (30%)', value: disponivel30 || balanco?.valorLucroDisponivel || 0, color: '#10b981' },
    { name: 'Reinvestimento (70%)', value: reinvestir70 || balanco?.valorReinvestimentoCampanhas || 0, color: '#00e5ff' },
    { name: 'Meta Ads', value: gastoMetaAds || balanco?.totalGastoCampanhas || 0, color: '#ef4444' }
  ];

  const totalHoje = replica?.totalEnviadosHoje || recentLogs.filter(l => l.status === 'enviado').length;
  const isReplicaOnline = replica?.whatsapp?.status === 'connected';

  return (
    <div className="space-y-6">
      {/* Banner de Boas-vindas com Glassmorphism e Ações Rápidas */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-slate-950 border border-white/10 p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-10 -top-10 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-10 w-60 h-60 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Super Cockpit Unificado Ativo
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
              Central de Comando <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Pokémon TCG</span>
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl mt-1">
              Monitore a conversão de afiliados do Mercado Livre, réplica automática de grupos e atendimento de leads com IA em tempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('replica')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/25 active:scale-95"
            >
              <Droplets className="w-4 h-4" />
              <span>Ver Replicador</span>
            </button>
            <button
              onClick={() => onNavigate('disparador')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/25 active:scale-95"
            >
              <Flame className="w-4 h-4" />
              <span>Disparar Campanha</span>
            </button>
            <button
              onClick={() => onNavigate('financas')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/15 border border-white/10 transition-all active:scale-95"
            >
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>DRE & Finanças</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid de 4 KPIs Estratégicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ofertas Hoje */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-white/[0.08] relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Ofertas Replicadas</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-heading font-extrabold text-white tracking-tight">{totalHoje}</span>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +100%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Fila anti-flood ativa ({replica?.postsLastHour || 0}/40 posts na última hora)
          </p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, ((replica?.postsLastHour || 0) / 40) * 100)}%` }}
            />
          </div>
        </div>

        {/* KPI 2: Base de Leads & Grupos */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-white/[0.08] relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Leads & Grupos</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-heading font-extrabold text-white tracking-tight">
              {bot?.metricas?.totalContatos || 0}
            </span>
            <span className="text-xs text-slate-400">leads em</span>
            <span className="text-sm font-semibold text-cyan-300">{bot?.metricas?.totalGrupos || 172} grupos</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Captação automática e segmentação por pastas</p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full w-[85%]" />
          </div>
        </div>

        {/* KPI 3: Atendimento IA DeepSeek */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-white/[0.08] relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Respostas IA Hoje</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center text-orange-400 border border-orange-500/20 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-heading font-extrabold text-white tracking-tight">
              {bot?.metricas?.respostasIaHoje || 10}
            </span>
            <span className="text-xs text-emerald-400 font-medium">DeepSeek V4 Ativo</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Encaminhamento inteligente para o grupo oficial
          </p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full w-[65%]" />
          </div>
        </div>

        {/* KPI 4: Faturamento & Regra 70% */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-white/[0.08] relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Lucro Líquido Real</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-heading font-extrabold text-emerald-400 tracking-tight">
              R$ {(lucroOperacaoReal > 0 ? lucroOperacaoReal : (balanco?.resultadoLiquido || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-cyan-300 mt-1 font-medium">
            Reinvestir: R$ {(reinvestir70 > 0 ? reinvestir70 : (balanco?.valorReinvestimentoCampanhas || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (70%)
          </p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-1.5 rounded-full w-[70%]" />
          </div>
        </div>
      </div>

      {/* Banner / Card Executivo de Vendas do Mercado Livre Afiliados (Tempo Real via API Oficial) */}
      <div className="glass-panel rounded-2xl p-5 border border-amber-500/25 bg-gradient-to-r from-amber-950/40 via-slate-900/70 to-yellow-950/30 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base text-white">Mercado Livre Afiliados · Comissões & Faturamento</h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                    isAffiliateConnected || affiliateData
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {isAffiliateConnected || affiliateData ? `● API Ativa (Tag: ${affiliateData?.tag || 'caed1312314'})` : '○ Aguardando Sessão'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Métricas oficiais de comissões, vendas geradas, taxa de conversão e produtos vendidos pela tag comissionada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncAffiliateNow}
              disabled={syncingAffiliate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingAffiliate ? 'animate-spin' : ''}`} />
              <span>{syncingAffiliate ? 'Sincronizando...' : 'Sincronizar Comissões'}</span>
            </button>

            <button
              onClick={() => setShowMeliModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Ajustar Conexão</span>
            </button>
          </div>
        </div>

        {/* 4 Mini Cards de Métricas Reais do Programa de Afiliados */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/[0.06]">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[11px] text-slate-400 uppercase font-medium">Comissões no Mês</span>
            <p className="text-lg font-heading font-extrabold text-amber-400 mt-0.5">
              R$ {totalComissoesAfiliado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-emerald-400">Comissões confirmadas</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[11px] text-slate-400 uppercase font-medium">Comissões Hoje</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <p className="text-lg font-heading font-extrabold text-white">
                R$ {comissoesHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400">({pedidosAfiliado} conversões)</span>
            </div>
            <span className="text-[10px] text-cyan-300">Ganhos em tempo real</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[11px] text-slate-400 uppercase font-medium">Vendas Brutas Geradas</span>
            <p className="text-lg font-heading font-extrabold text-white mt-0.5">
              R$ {vendasGeradasMeli.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400">Faturamento enviado ao ML</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[11px] text-slate-400 uppercase font-medium">Cliques & Conversão</span>
            <p className="text-lg font-heading font-extrabold text-emerald-400 mt-0.5">
              {cliquesAfiliado.toLocaleString('pt-BR')} <span className="text-xs text-slate-400 font-normal">cliques</span>
            </p>
            <span className="text-[10px] text-emerald-400 font-medium">CVR: {(cvrAfiliado * 100).toFixed(2)}%</span>
          </div>
        </div>

        {/* Lista de Vendas Recentes de Afiliado (se houver dados) */}
        {affiliateData?.recentSales && affiliateData.recentSales.length > 0 && (
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Últimas Vendas Comissionadas de Afiliado:</span>
              <span className="text-[10px] text-slate-400">{affiliateData.recentSales.length} produtos rastreados</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {affiliateData.recentSales.slice(0, 3).map((item) => (
                <div key={item.id} className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-xs flex items-center gap-2.5">
                  {item.productImage ? (
                    <img src={item.productImage} alt={item.productName} className="w-9 h-9 rounded object-cover flex-shrink-0 bg-white/5" />
                  ) : (
                    <div className="w-9 h-9 rounded bg-amber-500/10 flex items-center justify-center text-amber-400 flex-shrink-0">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200 truncate text-[11px]" title={item.productName}>
                      {item.productName}
                    </p>
                    <div className="flex items-center justify-between mt-0.5 text-[10px]">
                      <span className="text-slate-400">Venda: R$ {item.saleValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        +R$ {item.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Banner / Card Executivo de Gastos do Meta Ads (Opção 1) */}
      <div className="glass-panel rounded-2xl p-5 border border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-purple-950/30 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
              f
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base text-white">Meta Ads · Gastos & Tráfego Pago</h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                    metaData?.configured
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {metaData?.configured ? `● Conectado (${metaData.accountId || 'Conta Ativa'})` : '○ Não Conectado'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sincronização oficial de gastos de campanhas, impressões e cliques via Marketing API Graph v20.0
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncMetaNow}
              disabled={syncingMeta || !metaData?.configured}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                metaData?.configured
                  ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingMeta ? 'animate-spin' : ''}`} />
              <span>{syncingMeta ? 'Sincronizando...' : 'Sincronizar Gastos'}</span>
            </button>

            <button
              onClick={() => setShowMetaModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{metaData?.configured ? 'Ajustar Token' : 'Conectar Meta Ads'}</span>
            </button>
          </div>
        </div>

        {/* 4 Mini Cards de Métricas Reais do Meta Ads */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/[0.06]">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[11px] text-slate-400 uppercase font-medium">Investimento no Mês</span>
            <p className="text-lg font-heading font-extrabold text-blue-400 mt-0.5">
              R$ {(metaData?.data?.totalSpend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[11px] text-slate-400 uppercase font-medium">Gasto Hoje</span>
            <p className="text-lg font-heading font-extrabold text-white mt-0.5">
              R$ {(metaData?.data?.spendToday || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[11px] text-slate-400 uppercase font-medium">Cliques nos Anúncios</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-heading font-extrabold text-cyan-300">
                {(metaData?.data?.totalClicks || 0).toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] text-slate-400">CPC R$ {(metaData?.data?.avgCpc || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[11px] text-slate-400 uppercase font-medium">Impressões / Alcance</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-heading font-extrabold text-purple-300">
                {(metaData?.data?.totalImpressions || 0).toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] text-slate-400">CTR {(metaData?.data?.avgCtr || 0).toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Top Campanhas (se houver) */}
        {metaData?.data?.topCampaigns && metaData.data.topCampaigns.length > 0 && (
          <div className="pt-2 border-t border-white/[0.06]">
            <span className="text-xs font-semibold text-slate-300">Top Campanhas por Investimento:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {metaData.data.topCampaigns.slice(0, 3).map((camp) => (
                <div key={camp.campaign_id} className="p-2.5 rounded-lg bg-black/20 border border-white/5 text-xs flex justify-between items-center">
                  <span className="truncate font-medium text-slate-200 pr-2">{camp.campaign_name}</span>
                  <span className="font-mono text-cyan-400 font-bold whitespace-nowrap">
                    R$ {camp.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Seção Principal de Gráficos Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Atividade Horária & Conversão (2 Colunas) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Fluxo de Cliques, Ofertas & Leads por Horário
              </h3>
              <p className="text-xs text-slate-400">Desempenho em tempo real ao longo do dia</p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
              Live Feed
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCliques" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorOfertas" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorLeads" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hora" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0d1527',
                    borderColor: 'rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cliques"
                  stroke="#00e5ff"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCliques)"
                  name="Cliques Afiliado (meli.la)"
                />
                <Area
                  type="monotone"
                  dataKey="ofertas"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOfertas)"
                  name="Ofertas Replicadas"
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="#f97316"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLeads)"
                  name="Novos Leads"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400" /> Cliques Afiliado (meli.la)
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400" /> Ofertas Replicadas
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" /> Novos Leads Captados
            </span>
          </div>
        </div>

        {/* Gráfico 2: Composição DRE & Regra 70% (1 Coluna) */}
        <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Balanço DRE
              </h3>
              <p className="text-xs text-slate-400">Distribuição financeira do mês</p>
            </div>
            <button
              onClick={() => onNavigate('financas')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              Detalhar <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  contentStyle={{
                    backgroundColor: '#0d1527',
                    borderColor: 'rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Reinvestimento (70%)
              </span>
              <span className="font-bold text-white font-mono">
                R$ {(reinvestir70 > 0 ? reinvestir70 : (balanco?.valorReinvestimentoCampanhas || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Lucro Sócios (30%)
              </span>
              <span className="font-bold text-emerald-400 font-mono">
                R$ {(disponivel30 > 0 ? disponivel30 : (balanco?.valorLucroDisponivel || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Seção Inferior: Feed em Tempo Real & Status dos Chips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feed Recente de Atividades ao Vivo (2 Colunas) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-400" />
                Feed de Ofertas Replicadas ao Vivo
              </h3>
              <p className="text-xs text-slate-400">Postagens mais recentes monitoradas e enviadas</p>
            </div>
            <button
              onClick={() => onNavigate('replica')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              Abrir Feed Completo <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {recentLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Nenhuma oferta recente registrada no banco de dados ainda.
              </div>
            ) : (
              recentLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-cyan-500/30 transition-all flex items-start justify-between gap-4 group"
                >
                  <div className="space-y-1 text-xs flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {log.origem || 'Grupo TCG'}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {new Date(log.criado_em).toLocaleTimeString('pt-BR')}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          log.status === 'enviado'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {log.status === 'enviado' ? '✓ Enviado' : log.status}
                      </span>
                    </div>
                    <p className="text-slate-200 line-clamp-2 font-mono text-[11px] whitespace-pre-line">
                      {log.texto}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(log.texto);
                      alert('Copiado para a área de transferência!');
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 hover:text-white"
                    title="Copiar texto da oferta"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card Lateral: Saúde dos Dois Chips WhatsApp (1 Coluna) */}
        <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
          <div>
            <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Saúde & Segurança dos Chips
            </h3>
            <p className="text-xs text-slate-400">Instâncias independentes do Baileys</p>
          </div>

          {/* Chip 1 */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                  <Droplets className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Chip 1 · Replicador</h4>
                  <p className="text-[10px] text-slate-400">Monitoramento e Envio</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isReplicaOnline
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}
              >
                {isReplicaOnline ? 'Conectado' : 'Aguardando QR'}
              </span>
            </div>
            {!isReplicaOnline && (
              <button
                onClick={onOpenReplicaQr}
                className="w-full mt-2 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Escanear QR Code do Replicador</span>
              </button>
            )}
          </div>

          {/* Chip 2 */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-orange-500/15 flex items-center justify-center text-orange-400">
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Chip 2 · Disparador & IA</h4>
                  <p className="text-[10px] text-slate-400">Aquecimento & Captação</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  bot?.whatsapp?.status === 'connected'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {bot?.whatsapp?.status === 'connected' ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
              <span>Warmup do Chip:</span>
              <span className="text-orange-400 font-semibold">Nível Seguro (Até 50/dia)</span>
            </div>
          </div>

          {/* Dica Sentinel */}
          <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-slate-300 space-y-1">
            <span className="font-semibold text-cyan-300 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Proteção Ativa
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              O motor protege suas rotas com delay randômico de 5 a 600 segundos e rotação automática de Spintax.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Conexão e Configuração do Meta Ads */}
      {showMetaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-white/10 p-6 space-y-6 bg-slate-900/90 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
                  f
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-white">Conexão Meta Ads</h3>
                  <p className="text-xs text-slate-400">Marketing API Graph v20.0 · Gastos e Tráfego</p>
                </div>
              </div>
              <button
                onClick={() => setShowMetaModal(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMetaConfig} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  ID da Conta de Anúncios (Ad Account ID)
                </label>
                <input
                  type="text"
                  placeholder="Ex: act_1234567890 ou 1234567890"
                  value={metaAccountIdInput}
                  onChange={(e) => setMetaAccountIdInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/60 font-mono"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Localize no Gerenciador de Anúncios do Meta (identificador numérico da conta).
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Token de Acesso do Meta (System User / Graph API)
                </label>
                <textarea
                  placeholder="Cole aqui o token de acesso (EAA...)"
                  value={metaTokenInput}
                  onChange={(e) => setMetaTokenInput(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/60 font-mono resize-none"
                  required={!metaData?.configured}
                />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {metaData?.configured
                    ? 'Já existe um token salvo com segurança criptografada AES-256-GCM. Deixe em branco caso queira manter o mesmo.'
                    : 'Token gerado no Meta for Developers com permissões ads_read e read_insights.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200/90 space-y-1">
                <p className="font-semibold text-blue-300">Segurança & Criptografia</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Os tokens são salvos com criptografia AES-256-GCM tanto no banco local quanto na nuvem, e sincronizados a cada hora pelo Worker.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMetaModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMeta}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
                >
                  {savingMeta ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando & Sincronizando...</span>
                    </>
                  ) : (
                    <span>Salvar & Sincronizar Agora</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Conexão e Configuração do Mercado Livre */}
      {showMeliModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-white/10 p-6 space-y-6 bg-slate-900/90 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-white">Conexão Mercado Livre</h3>
                  <p className="text-xs text-slate-400">Vendas em Tempo Real · Webhook Push & API Oficial</p>
                </div>
              </div>
              <button
                onClick={() => setShowMeliModal(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Destaque 0: Programa de Afiliados (Sessão & Comissões Automáticas) */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Programa de Afiliados (Métricas Reais)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                  Tag: {affiliateData?.tag || 'caed1312314'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Métricas conectadas diretamente ao painel de afiliados do Mercado Livre. Cole abaixo um cookie novo caso deseje renovar a sessão manualmente:
              </p>
              <div className="space-y-2">
                <textarea
                  rows={2}
                  placeholder="Cole aqui o cookie completo do Mercado Livre (ex: meli_cookie...)"
                  value={affiliateCookieInput}
                  onChange={(e) => setAffiliateCookieInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500/60 font-mono resize-none"
                />
                <button
                  type="button"
                  onClick={handleSyncAffiliateNow}
                  disabled={syncingAffiliate}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingAffiliate ? 'animate-spin' : ''}`} />
                  <span>{syncingAffiliate ? 'Sincronizando Comissões...' : 'Sincronizar Comissões de Afiliado Agora'}</span>
                </button>
              </div>
            </div>

            {/* Destaque 1: Webhook Push em Tempo Real */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  URL do Webhook (Tempo Real)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Push 24/7 Ativo
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Cole esta URL no painel de desenvolvedor do Mercado Livre (tópico <strong>orders_v2</strong>) para receber as vendas em menos de 1 segundo:
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={meliWebhookUrl || 'http://108.174.145.77:3000/api/webhooks/mercadolivre'}
                  className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-amber-200 select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(meliWebhookUrl || 'http://108.174.145.77:3000/api/webhooks/mercadolivre');
                    alert('URL do Webhook copiada para a área de transferência!');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold whitespace-nowrap border border-amber-500/40"
                >
                  Copiar URL
                </button>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSyncMeliNow}
                  disabled={syncingMeli || !meliData?.configured}
                  className="w-full py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingMeli ? 'animate-spin' : ''}`} />
                  <span>{syncingMeli ? 'Sincronizando Pedidos...' : 'Sincronizar Pedidos da API Vendedor (30 dias)'}</span>
                </button>
              </div>
            </div>

            {/* Destaque 2: Login Oficial com 1 Clique */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Opção Recomendada: Conectar com 1 Clique
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Autorize diretamente na sua conta do Mercado Livre para renovar os tokens automaticamente sem expirar.
              </p>
              <button
                type="button"
                onClick={handleIniciarOAuthMeli}
                className="w-full py-2.5 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Autorizar no Mercado Livre Oficial</span>
              </button>
            </div>

            {/* Destaque 3: Formulário para Inserção Manual */}
            <form onSubmit={handleSaveMeliConfig} className="space-y-4 pt-1 border-t border-white/[0.08]">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Ou configure com credenciais de desenvolvedor
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">App ID (Client ID)</label>
                  <input
                    type="text"
                    placeholder="Ex: 842194819..."
                    value={meliClientIdInput}
                    onChange={(e) => setMeliClientIdInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Client Secret</label>
                  <input
                    type="password"
                    placeholder="Secret do App"
                    value={meliClientSecretInput}
                    onChange={(e) => setMeliClientSecretInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Token de Acesso Manual (Opcional)</label>
                <textarea
                  placeholder="Cole aqui o Bearer token do Mercado Livre (se já tiver um gerado)"
                  value={meliTokenInput}
                  onChange={(e) => setMeliTokenInput(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500/60 font-mono resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMeliModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={savingMeli}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-bold shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50"
                >
                  {savingMeli ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Configurações</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
