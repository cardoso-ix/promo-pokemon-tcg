import React from 'react';
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
  Sparkles
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
import type { UnifiedStatus, OfertaLog, BalancoFinanceiro } from '../types/index.ts';

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

  // Dados sintéticos enriquecidos para o gráfico de fluxo diário
  const activityData = [
    { hora: '08h', ofertas: 2, cliques: 18, leads: 4 },
    { hora: '10h', ofertas: 5, cliques: 45, leads: 12 },
    { hora: '12h', ofertas: 8, cliques: 92, leads: 26 },
    { hora: '14h', ofertas: 6, cliques: 64, leads: 15 },
    { hora: '16h', ofertas: 9, cliques: 110, leads: 32 },
    { hora: '18h', ofertas: 12, cliques: 145, leads: 48 },
    { hora: '20h', ofertas: 15, cliques: 180, leads: 60 },
    { hora: '22h', ofertas: 7, cliques: 78, leads: 20 },
  ];

  const pieData = [
    { name: 'Lucro Disponível (30%)', value: balanco?.retirada_liquida_30 || 735, color: '#10b981' },
    { name: 'Reinvestimento (70%)', value: balanco?.reinvestimento_sugerido_70 || 1715, color: '#00e5ff' },
    { name: 'Meta Ads', value: balanco?.gastos_meta_ads || 1200, color: '#ef4444' }
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
            <span className="text-xs font-medium uppercase tracking-wider">Lucro Líquido (Mês)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-heading font-extrabold text-emerald-400 tracking-tight">
              R$ {(balanco?.lucro_liquido || 2450).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-cyan-300 mt-1 font-medium">
            Reinvestir: R$ {(balanco?.reinvestimento_sugerido_70 || 1715).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (70%)
          </p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-1.5 rounded-full w-[70%]" />
          </div>
        </div>
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
                  name="Cliques Afiliado"
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

          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400" /> Cliques Afiliado (meli.la)
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" /> Novos Leads Captação
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
                R$ {(balanco?.reinvestimento_sugerido_70 || 1715).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Retirada (30%)
              </span>
              <span className="font-bold text-emerald-400 font-mono">
                R$ {(balanco?.retirada_liquida_30 || 735).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
    </div>
  );
};
