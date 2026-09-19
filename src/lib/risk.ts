import type { RiskLevel } from '@/types';

export const RISK_LEVELS: RiskLevel[] = ['LOW', 'MODERATE', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function scoreToLevel(score: number): RiskLevel {
  if (score >= 85) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  if (score >= 30) return 'MODERATE';
  return 'LOW';
}

/** Tailwind classes per risk level — used for badges, text, borders, backgrounds */
export const RISK_STYLES: Record<
  RiskLevel,
  { text: string; bg: string; border: string; dot: string; gradient: string; ring: string }
> = {
  LOW: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    gradient: 'from-emerald-500 to-emerald-600',
    ring: 'ring-emerald-500/40',
  },
  MODERATE: {
    text: 'text-lime-600',
    bg: 'bg-lime-500/10',
    border: 'border-lime-500/30',
    dot: 'bg-lime-500',
    gradient: 'from-lime-500 to-yellow-500',
    ring: 'ring-lime-500/40',
  },
  MEDIUM: {
    text: 'text-yellow-600',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    dot: 'bg-yellow-500',
    gradient: 'from-yellow-500 to-orange-500',
    ring: 'ring-yellow-500/40',
  },
  HIGH: {
    text: 'text-orange-600',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    dot: 'bg-orange-500',
    gradient: 'from-orange-500 to-red-500',
    ring: 'ring-orange-500/40',
  },
  CRITICAL: {
    text: 'text-red-600',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
    gradient: 'from-red-500 to-red-700',
    ring: 'ring-red-500/50',
  },
};

export function riskHex(level: RiskLevel): string {
  switch (level) {
    case 'LOW':
      return '#34d399';
    case 'MODERATE':
      return '#a3e635';
    case 'MEDIUM':
      return '#facc15';
    case 'HIGH':
      return '#fb923c';
    case 'CRITICAL':
      return '#f87171';
  }
}

export function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
