import { Grid3x3, Users, Route, Train, Building2, AlertCircle } from 'lucide-react';
import { Card, SectionHeader } from '@/components/ui/Card';
import { RiskBadge } from '@/components/ui/Badge';
import { HeatCell } from '@/components/ui/Charts';
import { LoadingState, ErrorState } from '@/components/ui/State';
import { RISK_STYLES } from '@/lib/risk';
import type { LocationWithRisk } from '@/types';

interface ImpactMatrixProps {
  locations: LocationWithRisk[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelectLocation: (id: string) => void;
  onRetry: () => void;
}

const DIFFICULTY_SCORE: Record<string, number> = {
  LOW: 1,
  MODERATE: 2,
  MEDIUM: 2,
  HIGH: 3,
  EXTREME: 4,
};

const ACCESS_SCORE: Record<string, number> = {
  EASY: 1,
  MODERATE: 2,
  DIFFICULT: 3,
  SEVERE: 4,
};

function computeImpactScore(loc: LocationWithRisk): number {
  const popScore = Math.min((loc.exposed_population / 15000) * 25, 25);
  const roadScore = loc.road_exposure !== 'None' ? 15 : 0;
  const railScore = loc.railway_exposure !== 'None' ? 15 : 0;
  const infraScore = Math.min(loc.critical_infrastructure.length * 7, 20);
  const evacScore = (DIFFICULTY_SCORE[loc.evacuation_difficulty] ?? 2) * 5;
  const histScore = Math.min(loc.historical_landslides * 0.5, 10);
  return Math.round(popScore + roadScore + railScore + infraScore + evacScore + histScore);
}

export function ImpactMatrix({
  locations,
  loading,
  error,
  selectedId,
  onSelectLocation,
  onRetry,
}: ImpactMatrixProps) {
  if (loading) return <LoadingState message="Loading impact matrix…" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!locations || locations.length === 0)
    return <ErrorState message="No locations available." onRetry={onRetry} />;

  const enriched = locations.map((l) => ({
    loc: l,
    impact: computeImpactScore(l),
    riskScore: l.latest_prediction?.risk_score ?? 0,
    riskLevel: l.latest_prediction?.risk_level ?? 'LOW',
  }));

  const maxPop = Math.max(...locations.map((l) => l.exposed_population));
  const maxInfra = Math.max(...locations.map((l) => l.critical_infrastructure.length));
  const maxImpact = 100;

  // Sorted by risk*impact composite (highest concern first)
  const sorted = [...enriched].sort(
    (a, b) => b.riskScore * b.impact - a.riskScore * a.impact,
  );

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="Impact Assessment Matrix"
          subtitle="Identify where high risk meets high impact — the highest operational concern"
          icon={<Grid3x3 size={18} />}
        />
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
          <AlertCircle size={18} className="shrink-0 text-yellow-600" />
          <p className="text-xs text-slate-600">
            <span className="font-bold text-yellow-600">High Risk + High Impact</span> = highest
            operational concern. Composite concern score = Risk Score × Impact Score.
          </p>
        </div>

        {/* Heatmap matrix */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Location
                </th>
                <th className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                  Risk
                </th>
                <th className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Users size={14} className="mx-auto" />
                  Pop.
                </th>
                <th className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Route size={14} className="mx-auto" />
                  Road
                </th>
                <th className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Train size={14} className="mx-auto" />
                  Rail
                </th>
                <th className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Building2 size={14} className="mx-auto" />
                  Infra
                </th>
                <th className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                  Evac
                </th>
                <th className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                  Impact
                </th>
                <th className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-cyan-600">
                  Concern
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ loc, impact, riskScore, riskLevel }) => {
                const s = RISK_STYLES[riskLevel];
                const concern = Math.round((riskScore * impact) / 100);
                const isSelected = loc.id === selectedId;
                return (
                  <tr
                    key={loc.id}
                    onClick={() => onSelectLocation(loc.id)}
                    className={`cursor-pointer border-b border-slate-200 transition-colors hover:bg-slate-100/50 ${
                      isSelected ? 'bg-cyan-500/5' : ''
                    }`}
                  >
                    <td className="py-2.5 pr-4">
                      <p className="text-sm font-medium text-slate-900">{loc.name}</p>
                      <p className="text-[10px] text-slate-500">{loc.state}</p>
                    </td>
                    <td className="px-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-sm font-bold ${s.text}`}>{Math.round(riskScore)}</span>
                        <RiskBadge level={riskLevel} />
                      </div>
                    </td>
                    <td className="px-2">
                      <HeatCell
                        value={loc.exposed_population}
                        max={maxPop}
                        label={`Population: ${loc.exposed_population}`}
                      />
                    </td>
                    <td className="px-2 text-center">
                      <span
                        className={`text-xs font-bold ${
                          loc.road_exposure !== 'None' ? 'text-red-600' : 'text-slate-400'
                        }`}
                      >
                        {loc.road_exposure !== 'None' ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td className="px-2 text-center">
                      <span
                        className={`text-xs font-bold ${
                          loc.railway_exposure !== 'None' ? 'text-red-600' : 'text-slate-400'
                        }`}
                      >
                        {loc.railway_exposure !== 'None' ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td className="px-2">
                      <HeatCell
                        value={loc.critical_infrastructure.length}
                        max={maxInfra}
                        label={`${loc.critical_infrastructure.length} critical assets`}
                      />
                    </td>
                    <td className="px-2 text-center">
                      <span
                        className={`text-xs font-bold ${
                          loc.evacuation_difficulty === 'EXTREME'
                            ? 'text-red-600'
                            : loc.evacuation_difficulty === 'HIGH'
                              ? 'text-orange-600'
                              : 'text-yellow-600'
                        }`}
                      >
                        {loc.evacuation_difficulty}
                      </span>
                    </td>
                    <td className="px-2">
                      <div className="flex flex-col items-center">
                        <HeatCell value={impact} max={maxImpact} label={`Impact: ${impact}/100`} />
                      </div>
                    </td>
                    <td className="px-2 text-center">
                      <div className="flex flex-col items-center">
                        <span
                          className={`text-lg font-black ${
                            concern > 50
                              ? 'text-red-600'
                              : concern > 30
                                ? 'text-orange-600'
                                : 'text-yellow-600'
                          }`}
                        >
                          {concern}
                        </span>
                        <span className="text-[9px] text-slate-500">/100</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {sorted.slice(0, 3).map(({ loc, impact, riskScore, riskLevel }, i) => {
          const s = RISK_STYLES[riskLevel];
          const concern = Math.round((riskScore * impact) / 100);
          return (
            <Card
              key={loc.id}
              className={`p-4 ${i === 0 ? 'border-red-500/30' : ''}`}
              onClick={() => onSelectLocation(loc.id)}
              active={loc.id === selectedId}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  #{i + 1} Highest Concern
                </span>
                <RiskBadge level={riskLevel} />
              </div>
              <p className="text-sm font-bold text-slate-900">{loc.name}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                <span>
                  Risk: <span className={s.text}>{Math.round(riskScore)}</span>
                </span>
                <span>
                  Impact: <span className="text-slate-900">{impact}</span>
                </span>
                <span>
                  Concern: <span className="font-bold text-cyan-600">{concern}</span>
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
