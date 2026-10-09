import React from 'react';

export type KpiTheme = 'gold' | 'cyan' | 'emerald' | 'violet' | 'amber' | 'slate';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  theme?: KpiTheme;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  badge,
  icon,
  theme = 'cyan',
  trend,
  onClick,
  className = ''
}) => {
  const themeStyles: Record<KpiTheme, { card: string; iconBox: string; glow: string }> = {
    gold: {
      card: 'border-amber-400/25 bg-gradient-to-br from-amber-500/[0.08] via-[#0d1527]/90 to-[#070d1e]/95 hover:border-amber-400/50 hover:shadow-glow-gold',
      iconBox: 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.4)]',
      glow: 'from-amber-400/20 to-transparent',
    },
    cyan: {
      card: 'border-cyan-400/25 bg-gradient-to-br from-cyan-500/[0.08] via-[#0d1527]/90 to-[#070d1e]/95 hover:border-cyan-400/50 hover:shadow-glow-cyan',
      iconBox: 'bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(0,229,255,0.4)]',
      glow: 'from-cyan-400/20 to-transparent',
    },
    emerald: {
      card: 'border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.08] via-[#0d1527]/90 to-[#070d1e]/95 hover:border-emerald-400/50 hover:shadow-glow-emerald',
      iconBox: 'bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]',
      glow: 'from-emerald-400/20 to-transparent',
    },
    violet: {
      card: 'border-purple-400/25 bg-gradient-to-br from-purple-500/[0.08] via-[#0d1527]/90 to-[#070d1e]/95 hover:border-purple-400/50',
      iconBox: 'bg-gradient-to-br from-purple-400 to-indigo-500 text-slate-950 shadow-[0_0_15px_rgba(168,85,247,0.4)]',
      glow: 'from-purple-400/20 to-transparent',
    },
    amber: {
      card: 'border-orange-400/25 bg-gradient-to-br from-orange-500/[0.08] via-[#0d1527]/90 to-[#070d1e]/95 hover:border-orange-400/50',
      iconBox: 'bg-gradient-to-br from-orange-400 to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(249,115,22,0.4)]',
      glow: 'from-orange-400/20 to-transparent',
    },
    slate: {
      card: 'border-white/[0.08] bg-gradient-to-br from-white/[0.03] via-[#0d1527]/90 to-[#070d1e]/95 hover:border-white/[0.18]',
      iconBox: 'bg-slate-800 text-slate-300 border border-white/10',
      glow: 'from-white/10 to-transparent',
    },
  };

  const current = themeStyles[theme] || themeStyles.cyan;

  return (
    <div
      onClick={onClick}
      className={`relative group overflow-hidden rounded-2xl p-5 border backdrop-blur-xl transition-all duration-300 ${
        onClick ? 'cursor-pointer' : ''
      } ${current.card} ${className}`}
    >
      {/* Luz ambiente interna no topo */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${current.glow} opacity-70 group-hover:opacity-100 transition-opacity`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-heading font-semibold text-slate-400 uppercase tracking-wider truncate">
              {title}
            </span>
            {badge && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/[0.06] text-slate-300 border border-white/10">
                {badge}
              </span>
            )}
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight mp-metric-value">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-semibold flex items-center ${
                  trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-400 truncate font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {icon && (
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${current.iconBox}`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
