import React from 'react';
import {
  Activity,
  ShoppingBag,
  Droplets,
  DollarSign,
  Search
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
      label: 'Visão 360°',
      icon: Activity,
      colorActive: 'text-cyan-300',
      bgActive: 'bg-blue-600/20 border-blue-500/40 text-cyan-300'
    },
    {
      id: 'afiliados' as const,
      label: 'Meli Afiliados',
      icon: ShoppingBag,
      colorActive: 'text-amber-300',
      bgActive: 'bg-amber-600/20 border-amber-500/40 text-amber-300'
    },
    {
      id: 'replica' as const,
      label: 'Replicador',
      icon: Droplets,
      colorActive: 'text-cyan-300',
      bgActive: 'bg-cyan-600/20 border-cyan-500/40 text-cyan-300'
    },
    {
      id: 'radar' as const,
      label: 'Radar TCG',
      icon: Search,
      colorActive: 'text-cyan-300',
      bgActive: 'bg-blue-600/20 border-blue-500/40 text-cyan-300'
    },
    {
      id: 'financas' as const,
      label: 'Finanças DRE',
      icon: DollarSign,
      colorActive: 'text-emerald-300',
      bgActive: 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
    }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#09101d]/95 backdrop-blur-2xl border-t border-white/[0.12] px-2 py-1.5 flex items-center justify-around shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
      {tabs.map(t => {
        const Icon = t.icon;
        const isActive = activeModule === t.id;

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectModule(t.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
              isActive
                ? `${t.bgActive} border font-bold shadow-sm`
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? t.colorActive : 'text-slate-400'}`} />
            <span className="text-[10px] tracking-tight leading-none whitespace-nowrap">
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
