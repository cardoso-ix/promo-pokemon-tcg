import React from 'react';
import {
  Flame,
  Droplets,
  DollarSign,
  Activity,
  LogOut,
  QrCode,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import type { ActiveModule } from '../types/index.ts';
import { useUnifiedStatus } from '../hooks/useUnifiedStatus.ts';
import { api } from '../services/api.ts';

interface HeaderProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  onOpenReplicaQr: () => void;
  onOpenBotQr: () => void;
  onOpenCookieModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  onSelectModule,
  onOpenReplicaQr,
  onOpenBotQr,
  onOpenCookieModal
}) => {
  const { isReplicaConnected, isReplicaQrReady, isBotConnected, isBotQrReady, isMeliValid } = useUnifiedStatus();

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
    <header className="sticky top-0 z-50 h-16 w-full bg-[#09101d]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between transition-all">
      {/* Brand / Logo */}
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => onSelectModule('dashboard')}
      >
        <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-orange-500/20 border border-white/10 flex items-center justify-center p-1.5 shadow-lg shadow-cyan-500/10 group-hover:scale-105 transition-transform">
          <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow">
            <circle cx="24" cy="24" r="22" fill="#cbd5e1" stroke="#082f49" strokeWidth="2.5" />
            <path d="M 2 24 A 22 22 0 0 1 46 24 Z" fill="#0284c7" />
            <path d="M 10 14 C 14 9, 19 7, 24 7 C 22 11, 20 16, 17 22 Z" fill="#00e5ff" />
            <path d="M 38 14 C 34 9, 29 7, 24 7 C 26 11, 28 16, 31 22 Z" fill="#f97316" />
            <line x1="2" y1="24" x2="46" y2="24" stroke="#082f49" strokeWidth="3" />
            <circle cx="24" cy="24" r="7" fill="#082f49" />
            <circle cx="24" cy="24" r="4.5" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx="24" cy="24" r="2" fill="#00e5ff" />
          </svg>
        </div>
        <div className="hidden sm:block">
          <h1 className="font-heading font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
            Promo Pokémon TCG
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
              Pro Hub
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">Cockpit Unificado de Automação</p>
        </div>
      </div>

      {/* Navegação Central de Módulos (Tabs) */}
      <nav className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] shadow-inner">
        <button
          onClick={() => onSelectModule('dashboard')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all ${
            activeModule === 'dashboard'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border border-blue-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-cyan-300" />
          <span>Visão Geral 360°</span>
        </button>

        <button
          onClick={() => onSelectModule('replica')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all ${
            activeModule === 'replica'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25 border border-cyan-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <Droplets className="w-3.5 h-3.5 text-cyan-300" />
          <span>Replicador</span>
        </button>

        <button
          onClick={() => onSelectModule('disparador')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all ${
            activeModule === 'disparador'
              ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md shadow-orange-500/25 border border-orange-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span>Disparador & IA</span>
        </button>

        <button
          onClick={() => onSelectModule('financas')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all ${
            activeModule === 'financas'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 border border-emerald-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-300" />
          <span>Finanças Meta</span>
        </button>
      </nav>

      {/* Ações Rápidas & Badges de Conexão */}
      <div className="flex items-center gap-2.5">
        {/* Badge Mercado Livre Sentinel */}
        <button
          onClick={onOpenCookieModal}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            isMeliValid
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 animate-pulse'
          }`}
          title="Clique para renovar o Cookie de afiliado Mercado Livre"
        >
          {isMeliValid ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>{isMeliValid ? 'meli.la Ativo' : 'Renovar Cookie'}</span>
        </button>

        {/* Badge WhatsApp Replicador */}
        <button
          onClick={onOpenReplicaQr}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            isReplicaConnected
              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'
              : isReplicaQrReady
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 animate-pulse'
              : 'bg-red-500/10 text-red-300 border-red-500/20 hover:bg-red-500/20'
          }`}
          title="Status do Chip do Replicador. Clique para escanear QR Code."
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isReplicaConnected ? 'bg-cyan-400 shadow-[0_0_8px_#00e5ff]' : 'bg-amber-400'
            }`}
          />
          <QrCode className="w-3 h-3 opacity-70" />
          <span>
            {isReplicaConnected ? 'Replicador OK' : isReplicaQrReady ? 'Escanear QR' : 'Replicador Off'}
          </span>
        </button>

        {/* Badge WhatsApp Disparador */}
        <button
          onClick={onOpenBotQr}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            isBotConnected
              ? 'bg-orange-500/10 text-orange-300 border-orange-500/30 hover:bg-orange-500/20'
              : isBotQrReady
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 animate-pulse'
              : 'bg-slate-800 text-slate-400 border-white/10 hover:bg-white/[0.06]'
          }`}
          title="Status do Chip do Disparador. Clique para escanear QR Code."
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isBotConnected ? 'bg-orange-400 shadow-[0_0_8px_#f97316]' : 'bg-slate-500'
            }`}
          />
          <QrCode className="w-3 h-3 opacity-70" />
          <span>
            {isBotConnected ? 'Disparador OK' : isBotQrReady ? 'Escanear QR' : 'Disparador Off'}
          </span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          title="Encerrar Sessão"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
