import React, { useState, useEffect } from 'react';
import type { ActiveModule, OfertaLog, BalancoFinanceiro } from './types/index.ts';
import { Header } from './components/Header.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { DashboardOverview } from './components/DashboardOverview.tsx';
import { ReplicadorView } from './components/ReplicadorView.tsx';
import { FinancasView } from './components/FinancasView.tsx';
import { MeliAfiliadosView } from './components/MeliAfiliadosView.tsx';
import { RadarPrecosView } from './components/RadarPrecosView.tsx';
import { CookieModal } from './components/CookieModal.tsx';
import { QrModal } from './components/QrModal.tsx';
import { ExtratorLeadsMetaView } from './components/ExtratorLeadsMetaView.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { useUnifiedStatus } from './hooks/useUnifiedStatus.ts';
import { api } from './services/api.ts';

export const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ActiveModule>('dashboard');
  const [recentLogs, setRecentLogs] = useState<OfertaLog[]>([]);
  const [balanco, setBalanco] = useState<BalancoFinanceiro | null>(null);

  // Modais
  const [cookieModalOpen, setCookieModalOpen] = useState(false);
  const [replicaQrOpen, setReplicaQrOpen] = useState(false);

  const { status, refetch } = useUnifiedStatus();

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

  const handleRefreshGlobal = async () => {
    await Promise.allSettled([
      refetch(),
      carregarOverview()
    ]);
  };

  // Carregar dados iniciais de dashboard
  useEffect(() => {
    carregarOverview();
    const interval = setInterval(carregarOverview, 25000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#070d1e] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Camada de Fundo Tecnológica & Auras Ambientais */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
        <div className="absolute inset-0 bg-tech-grid opacity-70"></div>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-amber-500/[0.04] blur-[160px]"></div>
        <div className="absolute top-[35%] left-10 w-[550px] h-[550px] rounded-full bg-cyan-500/[0.035] blur-[150px]"></div>
        <div className="absolute bottom-10 right-10 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.035] blur-[160px]"></div>
      </div>

      {/* Super Header Unificado */}
      <Header
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        onOpenReplicaQr={() => setReplicaQrOpen(true)}
        onOpenCookieModal={() => setCookieModalOpen(true)}
      />

      {/* Main Container com padding mobile seguro para BottomNav e largura ampla para monitores modernos */}
      <main className="relative z-10 flex-1 max-w-[1680px] w-full mx-auto p-3 sm:p-6 lg:p-8 pb-24 md:pb-8 transition-all">
        <ErrorBoundary>
          {activeModule === 'dashboard' && (
            <DashboardOverview
              status={status}
              recentLogs={recentLogs}
              balanco={balanco}
              onNavigate={(mod) => setActiveModule(mod)}
              onOpenReplicaQr={() => setReplicaQrOpen(true)}
              onRefreshGlobal={handleRefreshGlobal}
            />
          )}

          {activeModule === 'afiliados' && (
            <MeliAfiliadosView onOpenCookieModal={() => setCookieModalOpen(true)} />
          )}

          {activeModule === 'replica' && (
            <ReplicadorView onOpenCookieModal={() => setCookieModalOpen(true)} />
          )}

          {activeModule === 'radar' && <RadarPrecosView />}

          {activeModule === 'financas' && <FinancasView />}

          {activeModule === 'leads' && (
            <ExtratorLeadsMetaView onOpenQrModal={() => setReplicaQrOpen(true)} />
          )}
        </ErrorBoundary>
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
        title="WhatsApp · Replicador de Ofertas"
        waState={status?.replica?.whatsapp}
      />

      {/* Footer Minimalista */}
      <footer className="border-t border-white/[0.05] py-4 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1680px] w-full mx-auto mb-16 md:mb-0">
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

      {/* Barra de Navegação Inferior para Celular / Smartphones */}
      <BottomNav
        activeModule={activeModule}
        onSelectModule={setActiveModule}
      />
    </div>
  );
};
export default App;
