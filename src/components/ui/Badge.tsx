import type { ReactNode } from 'react';
import { RISK_STYLES } from '@/lib/risk';
import type { RiskLevel } from '@/types';

interface BadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md';
  children?: ReactNode;
}

export function RiskBadge({ level, size = 'sm', children }: BadgeProps) {
  const s = RISK_STYLES[level];
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wider ${s.bg} ${s.border} ${s.text} ${pad}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {children ?? level}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  size?: 'sm' | 'md';
}

export function SeverityBadge({ severity, size = 'sm' }: SeverityBadgeProps) {
  const map: Record<string, RiskLevel> = { MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' };
  return <RiskBadge level={map[severity]} size={size} />;
}

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-red-500/10 text-red-600 border-red-500/30',
    RESOLVED: 'bg-slate-500/10 text-slate-600 border-slate-400/30',
    SUBMITTED: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    VERIFIED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  };
  const cls = styles[status] ?? styles.SUBMITTED;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}
    >
      {status}
    </span>
  );
}
