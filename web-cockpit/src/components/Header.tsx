import React from 'react';
import {
  Droplets,
  DollarSign,
  Activity,
  LogOut,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  ShoppingBag,
  Search,
  Users
} from 'lucide-react';
import type { ActiveModule } from '../types/index.ts';
import { useUnifiedStatus } from '../hooks/useUnifiedStatus.ts';
import { api } from '../services/api.ts';

interface HeaderProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  onOpenReplicaQr: () => void;
  onOpenCookieModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  onSelectModule,
  onOpenReplicaQr,
  onOpenCookieModal
}) => {
  const { isReplicaConnected, isReplicaQrReady, isMeliValid } = useUnifiedStatus();

  const handleLogout = async () => {
    if (window.confirm('Deseja realmente encerrar a sessão na plataforma?')) {
      try {
        await api.logout();
      } finally {
        window.location.href = '/login.html';
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 h-16 w-full bg-[#070d1e]/90 backdrop-blur-xl border-b border-white/[0.08] px-3 sm:px-6 lg:px-8 flex items-center transition-all shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-[1680px] w-full mx-auto flex items-center justify-between">
        
        {/* LOGO OFICIAL COM MEDALHÃO DO BLASTOISE NO COCKPIT */}
        <div
          className="flex items-center gap-3 cursor-pointer group select-none"
          onClick={() => onSelectModule('dashboard')}
        >
          <div className="relative w-11 h-11 rounded-full p-[2.5px] bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 shadow-[0_0_20px_rgba(0,229,255,0.45)] group-hover:scale-105 transition-transform shrink-0">
            <img
              src="/brand/logo-blastoise-cockpit.png"
              alt="Logo Oficial Pokémon TCG Promo com Blastoise"
              className="w-full h-full rounded-full object-cover"
            />
            <div className="absolute inset-0 rounded-full bg-cyan-400/25 blur-md -z-10 group-hover:opacity-100 opacity-60 transition-opacity" />
          </div>

          <div className="block">
            <h1 className="font-display font-bold text-xs sm:text-sm tracking-wide text-white flex items-center gap-1.5">
              Pokémon TCG Promo
              <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-cyan-400/15 text-cyan-300 border border-cyan-400/35 font-bold hidden xs:inline tracking-wider">
                VIP COCKPIT
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-livedot" />
              <span>Centro de Comando Autônomo</span>
            </p>
          </div>
        </div>

        {/* NAVEGAÇÃO CENTRAL DE MÓDULOS (DESKTOP) */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] shadow-inner">
          <button
            onClick={() => onSelectModule('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all ${
              activeModule === 'dashboard'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-glow-cyan border border-cyan-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-300" />
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => onSelectModule('afiliados')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all ${
              activeModule === 'afiliados'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-glow-gold border border-amber-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
            <span>Meli Afiliados</span>
          </button>

          <button
            onClick={() => onSelectModule('replica')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all ${
              activeModule === 'replica'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-glow-cyan border border-cyan-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-cyan-300" />
            <span>Replicador</span>
          </button>

          <button
            onClick={() => onSelectModule('radar')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all ${
              activeModule === 'radar'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border border-blue-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-cyan-300" />
            <span>Radar TCG</span>
          </button>

          <button
            onClick={() => onSelectModule('financas')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all ${
              activeModule === 'financas'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-glow-emerald border border-emerald-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-300" />
            <span>Finanças Meta</span>
          </button>

          <button
            onClick={() => onSelectModule('leads')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all ${
              activeModule === 'leads'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-glow-cyan border border-cyan-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-cyan-300" />
            <span>Leads Meta</span>
            <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-emerald-500/30">
              NOVO
            </span>
          </button>
        </nav>

        {/* TELEMETRIA DE CONEXÕES & AÇÕES RÁPIDAS */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Badge Mercado Livre Sentinel */}
          <button
            onClick={onOpenCookieModal}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border backdrop-blur-md transition-all ${
              isMeliValid
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 animate-pulse'
            }`}
            title="Status do Cookie de Afiliado Mercado Livre. Clique para renovar."
          >
            {isMeliValid ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <span className="hidden sm:inline font-mono">{isMeliValid ? 'meli.la Ativo' : 'Renovar Cookie'}</span>
          </button>

          {/* Badge WhatsApp Replicador */}
          <button
            onClick={onOpenReplicaQr}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border backdrop-blur-md transition-all ${
              isReplicaConnected
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'
                : isReplicaQrReady
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 animate-pulse'
                : 'bg-red-500/10 text-red-300 border-red-500/25 hover:bg-red-500/20'
            }`}
            title="Status de Conexão do Chip do Replicador. Clique para escanear QR Code."
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isReplicaConnected ? 'bg-cyan-400 shadow-[0_0_8px_#00e5ff] animate-livedot' : 'bg-amber-400'
              }`}
            />
            <QrCode className="w-3.5 h-3.5 opacity-70 shrink-0" />
            <span className="hidden sm:inline font-mono">
              {isReplicaConnected ? 'Chip WhatsApp OK' : isReplicaQrReady ? 'Escanear QR' : 'Chip Offline'}
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-xl text-slate-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all shrink-0"
            title="Encerrar Sessão"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
