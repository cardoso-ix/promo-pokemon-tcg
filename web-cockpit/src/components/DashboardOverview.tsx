import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Zap,
  DollarSign,
  Droplets,
  ArrowUpRight,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Settings,
  X,
  ShoppingBag,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Wallet,
  CreditCard,
  CheckCircle2
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
import type {
  UnifiedStatus,
  OfertaLog,
  BalancoFinanceiro,
  FluxoHorarioItem,
  MetaInsightsOverview,
  MeliOrdersOverview,
  MeliAffiliateOverview,
  MetaAdBalanceInfo
} from '../types/index.ts';
import { api } from '../services/api.ts';

interface DashboardOverviewProps {
  status: UnifiedStatus | null;
  recentLogs: OfertaLog[];
  balanco: BalancoFinanceiro | null;
  onNavigate: (module: 'replica' | 'financas' | 'afiliados' | 'dashboard') => void;
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

  // Estado da Planilha de Métricas Horárias de 1 em 1 hora
  const [showPlanilhaHoraria, setShowPlanilhaHoraria] = useState(false);

  // Estado de Sincronização Unificada
  const [syncingAll, setSyncingAll] = useState(false);

  // Estados do Meta Ads
  const [metaData, setMetaData] = useState<MetaInsightsOverview | null>(null);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [metaTokenInput, setMetaTokenInput] = useState('');
  const [metaAccountIdInput, setMetaAccountIdInput] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);

  // Estados do Saldo de Caixa Meta Ads
  const [metaBalance, setMetaBalance] = useState<MetaAdBalanceInfo | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceRecargaInput, setBalanceRecargaInput] = useState('');
  const [balanceSaldoInput, setBalanceSaldoInput] = useState('');
  const [balanceDescInput, setBalanceDescInput] = useState('');
  const [balanceThresholdInput, setBalanceThresholdInput] = useState('50');
  const [balanceModeInput, setBalanceModeInput] = useState<'hybrid' | 'auto' | 'manual'>('hybrid');
  const [balanceTab, setBalanceTab] = useState<'recarga' | 'ajuste' | 'config'>('recarga');
  const [savingBalance, setSavingBalance] = useState(false);

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
    { hora: '08h', ofertas: 0, cliques: 0 },
    { hora: '10h', ofertas: 0, cliques: 0 },
    { hora: '12h', ofertas: 0, cliques: 0 },
    { hora: '14h', ofertas: 0, cliques: 0 },
    { hora: '16h', ofertas: 0, cliques: 0 },
    { hora: '18h', ofertas: 0, cliques: 0 },
    { hora: '20h', ofertas: 0, cliques: 0 },
    { hora: '22h', ofertas: 0, cliques: 0 },
  ]);

  const carregarMetaBalance = async () => {
    try {
      const res = await api.getMetaBalance();
      if (res && res.data) {
        setMetaBalance(res.data);
        if (res.data.alertThreshold) setBalanceThresholdInput(String(res.data.alertThreshold));
        if (res.data.mode) setBalanceModeInput(res.data.mode);
      }
    } catch {
      // Silencioso
    }
  };

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
    carregarMetaBalance();
    carregarMeliInsights();
    carregarMeliAffiliate();
    const interval = setInterval(() => {
      carregarFluxoReal();
      carregarMetaInsights();
      carregarMetaBalance();
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
      await Promise.all([carregarMetaInsights(), carregarMetaBalance()]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao salvar Meta Ads');
    } finally {
      setSavingMeta(false);
    }
  };

  const handleSyncAllNow = async () => {
    setSyncingAll(true);
    try {
      const res = await api.syncAll();
      alert(res.message || 'Métricas do Meta Ads e Mercado Livre sincronizadas com sucesso!');
      await Promise.all([
        carregarMetaInsights(),
        carregarMetaBalance(),
        carregarMeliInsights(),
        carregarMeliAffiliate(true)
      ]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha na sincronização unificada');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncMetaNow = async () => {
    setSyncingMeta(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await api.syncMetaInsights(trintaDiasAtras, hoje);
      alert(`Sincronização concluída com sucesso! ${res.totalSincronizados} registros de gastos atualizados.`);
      await Promise.all([carregarMetaInsights(), carregarMetaBalance()]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha na sincronização do Meta Ads');
    } finally {
      setSyncingMeta(false);
    }
  };

  const handleRegistrarRecarga = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(balanceRecargaInput.replace(',', '.'));
    if (!val || val <= 0) {
      return alert('Informe um valor de recarga válido maior que zero.');
    }
    setSavingBalance(true);
    try {
      const res = await api.updateMetaBalance({
        recarga: val,
        descricao: balanceDescInput || `Recarga de saldo Meta Ads via Cockpit: R$ ${val.toFixed(2)}`
      });
      alert(res.message || 'Recarga registrada com sucesso!');
      setMetaBalance(res.data);
      setBalanceRecargaInput('');
      setBalanceDescInput('');
      setShowBalanceModal(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao registrar recarga');
    } finally {
      setSavingBalance(false);
    }
  };

  const handleAjustarSaldoManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(balanceSaldoInput.replace(',', '.'));
    if (isNaN(val) || val < 0) {
      return alert('Informe um valor de saldo válido (zero ou positivo).');
    }
    setSavingBalance(true);
    try {
      const res = await api.updateMetaBalance({
        saldo: val,
        descricao: balanceDescInput || `Ajuste manual de saldo de caixa para R$ ${val.toFixed(2)}`,
        threshold: parseFloat(balanceThresholdInput) || 50,
        mode: balanceModeInput
      });
      alert(res.message || 'Saldo atualizado com sucesso!');
      setMetaBalance(res.data);
      setBalanceSaldoInput('');
      setBalanceDescInput('');
      setShowBalanceModal(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao ajustar saldo');
    } finally {
      setSavingBalance(false);
    }
  };

  const handleSalvarConfigCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    const thresholdVal = parseFloat(balanceThresholdInput.replace(',', '.'));
    setSavingBalance(true);
    try {
      const res = await api.updateMetaBalance({
        threshold: !isNaN(thresholdVal) ? thresholdVal : 50,
        mode: balanceModeInput,
        descricao: `Preferências de caixa atualizadas (Modo: ${balanceModeInput}, Alerta: R$ ${thresholdVal})`
      });
      alert('Preferências de caixa salvas com sucesso!');
      setMetaBalance(res.data);
      setShowBalanceModal(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao salvar preferências de caixa');
    } finally {
      setSavingBalance(false);
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
  const cliquesAfiliado = affiliateData?.totalClicks || 0;
  const cvrAfiliado = affiliateData?.cvr || 0;
  const gastoMetaAds = metaData?.data?.totalSpend || balanco?.totalGastoCampanhas || 0;
  const lucroOperacaoReal = Math.max(0, totalComissoesAfiliado - gastoMetaAds);
  const reinvestir70 = lucroOperacaoReal * 0.70;
  const disponivel30 = lucroOperacaoReal * 0.30;
  const roasBlended = gastoMetaAds > 0 && vendasGeradasMeli > 0 ? (vendasGeradasMeli / gastoMetaAds) : (balanco?.roiPercentual ? balanco.roiPercentual / 100 : 0);
  const isMetaConnected = Boolean(metaData?.configured);

  const pieData = [
    { name: 'Lucro Sócios (30%)', value: disponivel30 || balanco?.valorLucroDisponivel || 0, color: '#10b981' },
    { name: 'Reinvestimento (70%)', value: reinvestir70 || balanco?.valorReinvestimentoCampanhas || 0, color: '#00e5ff' },
    { name: 'Meta Ads', value: gastoMetaAds || balanco?.totalGastoCampanhas || 0, color: '#ef4444' }
  ];

  const totalHoje = replica?.totalEnviadosHoje || recentLogs.filter(l => l.status === 'enviado').length;
  const isReplicaOnline = replica?.whatsapp?.status === 'connected';

  return (
    <div className="space-y-6">
      {/* Header Enquadrado em Card Padrão com Sincronização Unificada */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/[0.08] bg-slate-900/60 shadow-xl backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className={`w-1.5 h-1.5 rounded-full ${isReplicaOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {isReplicaOnline ? 'WhatsApp & Cockpit Online' : 'Cockpit Ativo'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
            Central de Comando <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Pokémon TCG</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Gestão unificada de afiliados Mercado Livre, tráfego pago Meta Ads, réplica de grupos VIP e atendimento inteligente com IA em tempo real.
          </p>
        </div>

        {/* Botão Executivo de Sincronização Unificada Automática */}
        <div className="flex items-center gap-2.5 self-start lg:self-center flex-wrap">
          <button
            onClick={handleSyncAllNow}
            disabled={syncingAll}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/25 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncingAll ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            <span>{syncingAll ? 'Sincronizando Tudo...' : 'Sincronizar Métricas'}</span>
          </button>
        </div>
      </div>

      {/* Grid de 5 KPIs Estratégicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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

        {/* KPI 2: Tráfego Pago & Meta Ads */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-white/[0.08] relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Tráfego Meta Ads</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-heading font-extrabold text-white tracking-tight">
              R$ {gastoMetaAds.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {metaData?.data?.totalClicks || 0} cliques · {metaData?.data?.totalImpressions || 0} impressões
          </p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full w-[85%]" />
          </div>
        </div>

        {/* KPI 3: Caixa Meta Ads (Saldo & Recargas) */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-white/[0.08] relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
              <span>Caixa Meta Ads</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setBalanceSaldoInput(metaBalance ? String(metaBalance.currentBalance) : '');
                setShowBalanceModal(true);
              }}
              title="Gerenciar Caixa & Recargas do Meta Ads"
              className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-110 hover:bg-emerald-500/30 transition-all cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-heading font-extrabold text-white tracking-tight">
              R$ {(metaBalance?.currentBalance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-1 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                metaBalance?.statusBadge === 'healthy'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : metaBalance?.statusBadge === 'warning'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-red-500/15 text-red-400 border-red-500/30 animate-pulse'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  metaBalance?.statusBadge === 'healthy'
                    ? 'bg-emerald-400'
                    : metaBalance?.statusBadge === 'warning'
                    ? 'bg-amber-400'
                    : 'bg-red-400'
                }`}
              />
              {metaBalance?.statusBadge === 'healthy'
                ? 'Saldo Saudável'
                : metaBalance?.statusBadge === 'warning'
                ? 'Saldo Baixo'
                : 'Recarga Urgente'}
            </span>
            <button
              type="button"
              onClick={() => {
                setBalanceSaldoInput(metaBalance ? String(metaBalance.currentBalance) : '');
                setShowBalanceModal(true);
              }}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
            >
              Recarregar / Ajustar
            </button>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                metaBalance?.statusBadge === 'healthy'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 w-full'
                  : metaBalance?.statusBadge === 'warning'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 w-1/2'
                  : 'bg-gradient-to-r from-red-500 to-rose-400 w-1/5'
              }`}
            />
          </div>
        </div>

        {/* KPI 4: Blended ROAS & Performance */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-white/[0.08] relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Blended ROAS Geral</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-heading font-extrabold text-purple-400 tracking-tight">
              {roasBlended.toFixed(2)}x
            </span>
            <span className="text-xs text-emerald-400 font-medium">Retorno Operacional</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Vendas / Investimento em tráfego pago
          </p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full w-[75%]" />
          </div>
        </div>

        {/* KPI 5: Faturamento & Regra 70% */}
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

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onNavigate('afiliados')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all shadow-sm"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver Produtos & Audiência</span>
            </button>

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
            <span className="text-[10px] text-emerald-400">Comissões confirmadas ({affiliateData?.totalOrders ?? 0} vendas)</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[11px] text-slate-400 uppercase font-medium">Comissões Hoje</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <p className="text-lg font-heading font-extrabold text-white">
                R$ {comissoesHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-cyan-300">({affiliateData?.ordersToday ?? 0} hoje)</span>
            </div>
            <span className="text-[10px] text-slate-400">Total do mês: {affiliateData?.totalOrders ?? 0} pedidos</span>
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
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-white/[0.08] flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Fluxo de Cliques & Ofertas por Horário
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
                  1 em 1 hora
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Desempenho detalhado em tempo real ao longo do dia</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPlanilhaHoraria(!showPlanilhaHoraria)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                title="Visualizar métricas em formato de planilha de 1 em 1 hora"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{showPlanilhaHoraria ? 'Ocultar Planilha' : 'Planilha Horária (1 em 1h)'}</span>
                {showPlanilhaHoraria ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold hidden sm:inline">
                Live Feed
              </span>
            </div>
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
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hora" stroke="#64748b" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
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
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 border-t border-white/[0.04] pt-2">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400" /> Cliques Afiliado (meli.la)
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400" /> Ofertas Replicadas
            </span>
          </div>

          {/* TABELA PLANILHA HORÁRIA: DE 1 EM 1 HORA */}
          {showPlanilhaHoraria && (
            <div className="mt-3 pt-3 border-t border-white/[0.08] space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                  Extrato Horário Detalhado (Dia de Hoje)
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {activityData.length} faixas horárias auditadas
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/[0.08] max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0b1329] text-[10px] uppercase tracking-wider text-slate-400 sticky top-0 z-10 border-b border-white/[0.08]">
                    <tr>
                      <th className="py-2 px-3">Horário</th>
                      <th className="py-2 px-3 text-right">Cliques (meli.la)</th>
                      <th className="py-2 px-3 text-right">Ofertas Replicadas</th>
                      <th className="py-2 px-3 text-center">Intensidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03] bg-white/[0.01]">
                    {activityData.map((item, idx) => {
                      const totalMov = (item.cliques || 0) + (item.ofertas || 0);
                      const statusPico = totalMov >= 20 ? 'Alto Pico 🔥' : totalMov >= 5 ? 'Ativo ⚡' : 'Normal ⏳';
                      const badgeClass = totalMov >= 20
                        ? 'bg-red-500/20 text-red-300 border-red-500/30'
                        : totalMov >= 5
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        : 'bg-slate-500/10 text-slate-400 border-white/[0.06]';

                      return (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="py-1.5 px-3 font-mono font-bold text-slate-200">
                            {item.hora} às {String(parseInt(item.hora.replace('h', ''), 10) + 1).padStart(2, '0')}h
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono text-cyan-300 font-semibold">
                            {item.cliques > 0 ? item.cliques : <span className="text-slate-600">0</span>}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono text-emerald-400">
                            {item.ofertas > 0 ? item.ofertas : <span className="text-slate-600">0</span>}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                              {statusPico}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-[#0b1329] font-bold text-[11px] border-t border-white/[0.08] sticky bottom-0">
                    <tr>
                      <td className="py-2 px-3 text-slate-300">Total do Dia</td>
                      <td className="py-2 px-3 text-right font-mono text-cyan-300">
                        {activityData.reduce((acc, i) => acc + (i.cliques || 0), 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-400">
                        {activityData.reduce((acc, i) => acc + (i.ofertas || 0), 0)}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">
                        Auditado
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
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

          {/* Tráfego Meta Ads */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-500/15 flex items-center justify-center text-blue-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Meta Ads · Tráfego Pago</h4>
                  <p className="text-[10px] text-slate-400">Atribuição & Comissões</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isMetaConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {isMetaConnected ? 'API Ativa' : 'Aguardando Token'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
              <span>Conta Meta:</span>
              <span className="text-cyan-300 font-mono font-semibold">{metaData?.accountId || 'Configurada'}</span>
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

      {/* Modal de Gestão de Caixa & Recargas do Meta Ads */}
      {showBalanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-white/10 p-6 space-y-5 bg-slate-900/95 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-white">Caixa & Recargas Meta Ads</h3>
                  <p className="text-xs text-slate-400">Controle de saldo, recargas e alertas de verba de tráfego</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBalanceModal(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Card de Visão Geral do Saldo */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo de Caixa Disponível</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    metaBalance?.statusBadge === 'healthy'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : metaBalance?.statusBadge === 'warning'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-red-500/15 text-red-400 border-red-500/30 animate-pulse'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      metaBalance?.statusBadge === 'healthy'
                        ? 'bg-emerald-400'
                        : metaBalance?.statusBadge === 'warning'
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                    }`}
                  />
                  {metaBalance?.statusBadge === 'healthy'
                    ? 'Saldo Saudável'
                    : metaBalance?.statusBadge === 'warning'
                    ? 'Saldo Baixo'
                    : 'Recarga Urgente'}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-heading font-extrabold text-white tracking-tight">
                  R$ {(metaBalance?.currentBalance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-400">
                  ({metaBalance?.currency || 'BRL'})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Conta de Anúncios</span>
                  <span className="text-white font-medium font-mono text-[11px] truncate block">
                    {metaBalance?.accountName || 'Meta Ads'} ({metaBalance?.accountId ? `act_${metaBalance.accountId}` : 'Não configurada'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Origem dos Dados</span>
                  <span className="text-cyan-300 font-medium text-[11px] capitalize block">
                    {metaBalance?.source === 'api' ? 'Graph API Meta' : metaBalance?.source === 'hybrid' ? 'Híbrido (API + Manual)' : 'Lançamento Manual'}
                  </span>
                </div>
              </div>
            </div>

            {/* Abas de Ação */}
            <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setBalanceTab('recarga')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  balanceTab === 'recarga'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                + Adicionar Recarga
              </button>
              <button
                type="button"
                onClick={() => setBalanceTab('ajuste')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  balanceTab === 'ajuste'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ajustar Saldo Exato
              </button>
              <button
                type="button"
                onClick={() => setBalanceTab('config')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  balanceTab === 'config'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Preferências & Alertas
              </button>
            </div>

            {/* Conteúdo da Aba 1: Adicionar Recarga */}
            {balanceTab === 'recarga' && (
              <form onSubmit={handleRegistrarRecarga} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Valor da Recarga (R$)</span>
                    <span className="text-[11px] text-emerald-400">Soma ao saldo atual</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                    <input
                      type="text"
                      placeholder="Ex: 100,00"
                      value={balanceRecargaInput}
                      onChange={(e) => setBalanceRecargaInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Descrição / Método (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Recarga via PIX / Boleto bancário"
                    value={balanceDescInput}
                    onChange={(e) => setBalanceDescInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingBalance}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{savingBalance ? 'Registrando...' : 'Confirmar e Somar Recarga'}</span>
                </button>
              </form>
            )}

            {/* Conteúdo da Aba 2: Ajustar Saldo Exato */}
            {balanceTab === 'ajuste' && (
              <form onSubmit={handleAjustarSaldoManual} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Novo Saldo Total (R$)</span>
                    <span className="text-[11px] text-amber-400">Substitui o saldo atual</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                    <input
                      type="text"
                      placeholder="Ex: 150,00"
                      value={balanceSaldoInput}
                      onChange={(e) => setBalanceSaldoInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Motivo do Ajuste (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Alinhamento com saldo do Gerenciador de Anúncios"
                    value={balanceDescInput}
                    onChange={(e) => setBalanceDescInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingBalance}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingBalance ? 'Atualizando...' : 'Definir Saldo Exato'}</span>
                </button>
              </form>
            )}

            {/* Conteúdo da Aba 3: Preferências & Alertas */}
            {balanceTab === 'config' && (
              <form onSubmit={handleSalvarConfigCaixa} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Modo de Operação do Caixa</label>
                  <select
                    value={balanceModeInput}
                    onChange={(e) => setBalanceModeInput(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="hybrid">Híbrido (Recomendado: Graph API + Ajuste Manual de Recargas)</option>
                    <option value="auto">Automático (Consulta direta Graph API Meta Ads)</option>
                    <option value="manual">Manual (Apenas recargas manuais informadas no Cockpit)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Limite de Alerta de Saldo Baixo (R$)</span>
                    <span className="text-[11px] text-amber-400">Dispara aviso quando o saldo for menor</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                    <input
                      type="text"
                      placeholder="50,00"
                      value={balanceThresholdInput}
                      onChange={(e) => setBalanceThresholdInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingBalance}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-all border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{savingBalance ? 'Salvando...' : 'Salvar Preferências'}</span>
                </button>
              </form>
            )}

            {/* Histórico Recente de Recargas */}
            {metaBalance?.recargas && metaBalance.recargas.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-xs font-semibold text-slate-300 block">Histórico de Movimentações de Caixa</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {metaBalance.recargas.slice(0, 5).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs"
                    >
                      <div>
                        <span className="text-white font-medium block truncate max-w-[220px]">
                          {r.descricao || 'Recarga de Saldo'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(r.data_recarga).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-right">
                        {r.valor > 0 ? (
                          <span className="text-emerald-400 font-bold font-mono">+ R$ {r.valor.toFixed(2)}</span>
                        ) : (
                          <span className="text-cyan-400 font-bold font-mono">Ajuste</span>
                        )}
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Saldo: R$ {r.saldo_resultante.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowBalanceModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

