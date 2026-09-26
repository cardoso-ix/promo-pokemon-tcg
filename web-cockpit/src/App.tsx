import React, { useState, useEffect } from 'react';
import type { ActiveModule, OfertaLog, BalancoFinanceiro } from './types/index.ts';
import { Header } from './components/Header.tsx';
import { DashboardOverview } from './components/DashboardOverview.tsx';
import { ReplicadorView } from './components/ReplicadorView.tsx';
import { DisparadorView } from './components/DisparadorView.tsx';
import { FinancasView } from './components/FinancasView.tsx';
import { CookieModal } from './components/CookieModal.tsx';
import { QrModal } from './components/QrModal.tsx';
import { useUnifiedStatus } from './hooks/useUnifiedStatus.ts';
import { api } from './services/api.ts';

export const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ActiveModule>('dashboard');
  const [recentLogs, setRecentLogs] = useState<OfertaLog[]>([]);
  const [balanco, setBalanco] = useState<BalancoFinanceiro | null>(null);

  // Modais
  const [cookieModalOpen, setCookieModalOpen] = useState(false);
  const [replicaQrOpen, setReplicaQrOpen] = useState(false);
  const [botQrOpen, setBotQrOpen] = useState(false);

  const { status, refetch } = useUnifiedStatus();

  // Carregar dados iniciais de dashboard
  useEffect(() => {
    const carregarOverview = async () => {
      try {
        const [logs, meses]: [OfertaLog[], string[]] = await Promise.all([
          api.getReplicaLogs(20).catch((): OfertaLog[] => []),
          api.getFinancasMeses().catch((): string[] => [])
        ]);
        setRecentLogs(logs);

        const mesAtual = new Date().toISOString().slice(0, 7);
        const mesParaConsultar = meses.includes(mesAtual) ? mesAtual : meses[0] || mesAtual;
        const bal = await api.getBalanco(mesParaConsultar).catch(() => null);
        setBalanco(bal);
      } catch {
        // Ignorar
      }
    };

    carregarOverview();
    const interval = setInterval(carregarOverview, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#070d17] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Super Header Unificado */}
      <Header
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        onOpenReplicaQr={() => setReplicaQrOpen(true)}
        onOpenBotQr={() => setBotQrOpen(true)}
        onOpenCookieModal={() => setCookieModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 transition-all">
        {activeModule === 'dashboard' && (
          <DashboardOverview
            status={status}
            recentLogs={recentLogs}
            balanco={balanco}
            onNavigate={(mod) => setActiveModule(mod)}
            onOpenReplicaQr={() => setReplicaQrOpen(true)}
          />
        )}

        {activeModule === 'replica' && (
          <ReplicadorView onOpenCookieModal={() => setCookieModalOpen(true)} />
        )}

        {activeModule === 'disparador' && <DisparadorView />}

        {activeModule === 'financas' && <FinancasView />}
      </main>

      {/* Modais Globais de Ação Rápida */}
      <CookieModal
        isOpen={cookieModalOpen}
        onClose={() => setCookieModalOpen(false)}
        onSuccess={() => refetch()}
      />

      <QrModal
        isOpen={replicaQrOpen}
        onClose={() => setReplicaQrOpen(false)}
        title="Chip 1 · Replicador"
        waState={status?.replica?.whatsapp}
      />

      <QrModal
        isOpen={botQrOpen}
        onClose={() => setBotQrOpen(false)}
        title="Chip 2 · Disparador"
        waState={status?.bot?.whatsapp}
      />

      {/* Footer Minimalista */}
      <footer className="border-t border-white/[0.05] py-4 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Promo Pokémon TCG · Plataforma Autônoma de Alta Performance</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <span>Fastify Gateway :3000</span>
          <span>•</span>
          <span>SQLite WAL</span>
          <span>•</span>
          <span>DeepSeek V4</span>
        </div>
      </footer>
    </div>
  );
};
export default App;
