import React from 'react';
import {
  Activity,
  ShoppingBag,
  Droplets,
  DollarSign,
  Search,
  Users
} from 'lucide-react';
import type { ActiveModule } from '../types/index.ts';

interface BottomNavProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeModule,
  onSelectModule
}) => {
  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'Visão Geral',
      icon: Activity,
      colorActive: 'text-cyan-300',
      bgActive: 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300 shadow-glow-cyan'
    },
    {
      id: 'afiliados' as const,
      label: 'Afiliados',
      icon: ShoppingBag,
      colorActive: 'text-amber-300',
      bgActive: 'bg-amber-500/15 border-amber-400/40 text-amber-300 shadow-glow-gold'
    },
    {
      id: 'replica' as const,
      label: 'Replicador',
      icon: Droplets,
      colorActive: 'text-cyan-300',
      bgActive: 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300 shadow-glow-cyan'
    },
    {
      id: 'radar' as const,
      label: 'Radar TCG',
      icon: Search,
      colorActive: 'text-cyan-300',
      bgActive: 'bg-blue-500/15 border-blue-400/40 text-cyan-300'
    },
    {
      id: 'financas' as const,
      label: 'Finanças',
      icon: DollarSign,
      colorActive: 'text-emerald-300',
      bgActive: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 shadow-glow-emerald'
    },
    {
      id: 'leads' as const,
      label: 'Leads Meta',
      icon: Users,
      colorActive: 'text-cyan-300',
      bgActive: 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300 shadow-glow-cyan'
    }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070d1e]/95 backdrop-blur-2xl border-t border-white/[0.08] px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-[0_-8px_32px_rgba(0,0,0,0.7)]">
      {tabs.map(t => {
        const Icon = t.icon;
        const isActive = activeModule === t.id;

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectModule(t.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-0.5 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer relative ${
              isActive
                ? `${t.bgActive} border font-bold shadow-md`
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isActive && (
              <span className="absolute -top-1 w-4 h-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 shadow-sm shadow-amber-400/80" />
            )}
            <Icon className={`w-4 h-4 mb-0.5 transition-transform ${isActive ? `${t.colorActive} scale-110` : 'text-slate-400'}`} />
            <span className="text-[9px] font-heading tracking-tight leading-none whitespace-nowrap">
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
