import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

export function Card({ children, className = '', onClick, active }: CardProps) {
  const base =
    'rounded-xl border border-slate-200 bg-white shadow-sm';
  const interactive = onClick
    ? active
      ? 'cursor-pointer ring-1 ring-cyan-400/50 border-cyan-400/50'
      : 'cursor-pointer hover:border-slate-300 hover:shadow-md transition-all'
    : '';
  return (
    <div
      className={`${base} ${interactive} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' && onClick()) : undefined}
    >
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  right?: ReactNode;
}

export function SectionHeader({ title, subtitle, icon, right }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: string;
  sub?: string;
}

export function StatCard({ label, value, icon, accent = 'text-cyan-600', sub }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
        {icon && <span className={accent}>{icon}</span>}
      </div>
      <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </Card>
  );
}
