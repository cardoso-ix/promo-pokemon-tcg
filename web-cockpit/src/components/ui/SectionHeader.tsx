import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  badge,
  actions,
  className = ''
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-amber-400 shrink-0">
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display font-bold text-lg sm:text-xl text-white tracking-wide">
              {title}
            </h2>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 self-start sm:self-auto">{actions}</div>}
    </div>
  );
};
