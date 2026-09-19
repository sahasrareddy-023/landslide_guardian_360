import { ListOrdered, ChevronRight, Zap, Eye, ShieldCheck, Users, Building2, Gauge } from 'lucide-react';
import { Card, SectionHeader } from '@/components/ui/Card';
import { RiskBadge } from '@/components/ui/Badge';
import { LoadingState, ErrorState } from '@/components/ui/State';
import { RISK_STYLES } from '@/lib/risk';
import type { LocationWithRisk } from '@/types';

interface PriorityEngineProps {
  locations: LocationWithRisk[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelectLocation: (id: string) => void;
  onRetry: () => void;
}

const ACCESS_SCORE: Record<string, number> = {
  EASY: 4,
  MODERATE: 3,
  DIFFICULT: 2,
  SEVERE: 1,
};

const DIFFICULTY_SCORE: Record<string, number> = {
  LOW: 1,
  MODERATE: 2,
  MEDIUM: 2,
  HIGH: 3,
  EXTREME: 4,
};

interface RankedLocation {
  loc: LocationWithRisk;
  priority: number;
  riskScore: number;
  impactScore: number;
  accessibilityScore: number;
  confidenceScore: number;
  composite: number;
}

function computePriority(loc: LocationWithRisk): RankedLocation {
  const pred = loc.latest_prediction;
  const riskScore = pred?.risk_score ?? 0;
  const confidenceScore = pred?.confidence ?? 0;

  const popScore = Math.min((loc.exposed_population / 15000) * 25, 25);
  const infraScore = Math.min(loc.critical_infrastructure.length * 7, 20);
  const evacScore = (DIFFICULTY_SCORE[loc.evacuation_difficulty] ?? 2) * 5;
  const impactScore = Math.round(popScore + infraScore + evacScore);
  const accessibilityScore = (ACCESS_SCORE[loc.accessibility] ?? 2) * 25;

  const composite = Math.round(
    riskScore * 0.35 +
      impactScore * 0.25 +
      accessibilityScore * 0.15 +
      confidenceScore * 0.15 +
      Math.min(loc.historical_landslides, 20) * 0.5,
  );

  let priority = 3;
  if (composite >= 60) priority = 1;
  else if (composite >= 45) priority = 2;
  else if (composite >= 30) priority = 3;
  else priority = 4;

  return { loc, priority, riskScore, impactScore, accessibilityScore, confidenceScore, composite };
}

const PRIORITY_CONFIG: Record<
  number,
  { label: string; icon: typeof Zap; color: string; bg: string; border: string; desc: string }
> = {
  1: {
    label: 'PRIORITY 1',
    icon: Zap,
    color: 'text-red-600',
    bg: 'bg-red-500/10',
    border: 'border-red-500/40',
    desc: 'Immediate action required',
  },
  2: {
    label: 'PRIORITY 2',
    icon: Eye,
    color: 'text-orange-600',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/40',
    desc: 'Urgent monitoring & action',
  },
  3: {
    label: 'PRIORITY 3',
    icon: ShieldCheck,
    color: 'text-yellow-600',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/40',
    desc: 'Enhanced monitoring',
  },
  4: {
    label: 'PRIORITY 4',
    icon: ShieldCheck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    desc: 'Routine monitoring',
  },
};

export function PriorityEngine({
  locations,
  loading,
  error,
  selectedId,
  onSelectLocation,
  onRetry,
}: PriorityEngineProps) {
  if (loading) return <LoadingState message="Loading priority rankings…" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!locations || locations.length === 0)
    return <ErrorState message="No locations to rank." onRetry={onRetry} />;

  const ranked = locations.map(computePriority).sort((a, b) => b.composite - a.composite);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="Action Priority Engine"
          subtitle="Ranked operational priorities based on risk, impact, accessibility & confidence"
          icon={<ListOrdered size={18} />}
        />
        <div className="space-y-3">
          {ranked.map((r, idx) => {
            const cfg = PRIORITY_CONFIG[r.priority];
            const Icon = cfg.icon;
            const s = RISK_STYLES[r.loc.latest_prediction?.risk_level ?? 'LOW'];
            const isSelected = r.loc.id === selectedId;
            return (
              <button
                key={r.loc.id}
                onClick={() => onSelectLocation(r.loc.id)}
                className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? `${cfg.bg} ${cfg.border} ring-1 ring-cyan-500/30`
                    : 'border-slate-200 bg-white/50 hover:border-slate-300'
                }`}
              >
                {/* Rank number */}
                <div className="flex shrink-0 flex-col items-center">
                  <span className="text-2xl font-black text-slate-400">#{idx + 1}</span>
                </div>

                {/* Priority badge */}
                <div
                  className={`flex shrink-0 flex-col items-center gap-1 rounded-lg border px-3 py-2 ${cfg.bg} ${cfg.border}`}
                >
                  <Icon size={20} className={cfg.color} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
                    P{r.priority}
                  </span>
                </div>

                {/* Location info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{r.loc.name}</p>
                  <p className="text-xs text-slate-500">{cfg.desc}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Gauge size={12} className={s.text} />
                      Risk {Math.round(r.riskScore)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} className="text-orange-600" />
                      {(r.loc.exposed_population / 1000).toFixed(1)}k
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 size={12} className="text-red-600" />
                      {r.loc.critical_infrastructure.length} infra
                    </span>
                    <span>
                      Access: <span className="text-slate-600">{r.loc.accessibility}</span>
                    </span>
                    <span>
                      Confidence: <span className="text-cyan-600">{r.confidenceScore.toFixed(0)}%</span>
                    </span>
                  </div>
                </div>

                {/* Composite score */}
                <div className="flex shrink-0 flex-col items-center">
                  <span className={`text-3xl font-black ${cfg.color}`}>{r.composite}</span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">Composite</span>
                </div>

                <ChevronRight size={20} className="shrink-0 text-slate-400" />
              </button>
            );
          })}
        </div>
      </Card>

      {/* Priority legend */}
      <Card className="p-5">
        <SectionHeader title="Priority Classification" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const count = ranked.filter((r) => r.priority === Number(key)).length;
            return (
              <div
                key={key}
                className={`rounded-lg border p-3 ${cfg.bg} ${cfg.border}`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={18} className={cfg.color} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{cfg.desc}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{count}</p>
                <p className="text-[10px] text-slate-500">locations</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
