import React from 'react';

export type StatusVariant = 'emerald' | 'cyan' | 'gold' | 'amber' | 'red' | 'slate';

interface BadgeStatusProps {
  label: string;
  variant?: StatusVariant;
  pulse?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const BadgeStatus: React.FC<BadgeStatusProps> = ({
  label,
  variant = 'cyan',
  pulse = false,
  icon,
  className = ''
}) => {
  const styles: Record<StatusVariant, { badge: string; dot: string }> = {
    emerald: {
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15',
      dot: 'bg-emerald-400 shadow-[0_0_8px_#10b981]',
    },
    cyan: {
      badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/15',
      dot: 'bg-cyan-400 shadow-[0_0_8px_#00e5ff]',
    },
    gold: {
      badge: 'bg-amber-500/15 text-amber-300 border-amber-400/35 hover:bg-amber-500/20',
      dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
    },
    amber: {
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/15',
      dot: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]',
    },
    red: {
      badge: 'bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/15',
      dot: 'bg-red-400 shadow-[0_0_8px_#ef4444]',
    },
    slate: {
      badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/15',
      dot: 'bg-slate-400',
    },
  };

  const current = styles[variant] || styles.cyan;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border backdrop-blur-md transition-colors ${current.badge} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot} ${pulse ? 'animate-livedot' : ''}`} />
      {icon && <span className="opacity-90">{icon}</span>}
      <span className="tracking-tight">{label}</span>
    </span>
  );
};
