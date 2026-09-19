import {
  Users,
  Building2,
  MapPin,
  AlertTriangle,
  TrendingUp,
  CloudRain,
  Droplets,
  Mountain,
  Shield,
  Activity,
} from 'lucide-react';
import { Card, StatCard, SectionHeader } from '@/components/ui/Card';
import { RiskBadge } from '@/components/ui/Badge';
import { RiskGauge } from '@/components/ui/RiskGauge';
import { LoadingState, ErrorState } from '@/components/ui/State';
import { IntelFeed } from '@/components/layout/IntelFeed';
import { RISK_STYLES, scoreToLevel } from '@/lib/risk';
import type { Alert, IntelFeedEvent, LocationWithRisk } from '@/types';

interface CommandCenterProps {
  locations: LocationWithRisk[];
  loading: boolean;
  error: string | null;
  alerts: Alert[];
  selectedId: string | null;
  onSelectLocation: (id: string) => void;
  feedEvents: IntelFeedEvent[];
  onRetry: () => void;
}

export function CommandCenter({
  locations,
  loading,
  error,
  alerts,
  selectedId,
  onSelectLocation,
  feedEvents,
  onRetry,
}: CommandCenterProps) {
  if (loading) return <LoadingState message="Loading command center data…" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!locations || locations.length === 0)
    return <ErrorState message="No monitored locations found." onRetry={onRetry} />;

  const totalPop = locations.reduce((s, l) => s + l.exposed_population, 0);
  const totalInfra = locations.reduce((s, l) => s + l.critical_infrastructure.length, 0);
  const avgRisk =
    locations.reduce((s, l) => s + (l.latest_prediction?.risk_score ?? 0), 0) / locations.length;
  const overallLevel = scoreToLevel(avgRisk);
  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');
  const criticalCount = activeAlerts.filter((a) => a.severity === 'CRITICAL').length;
  const selected = locations.find((l) => l.id === selectedId) ?? locations[0];

  return (
    <div className="space-y-4">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="NER Risk Index"
          value={avgRisk.toFixed(1)}
          sub={overallLevel}
          icon={<Shield size={18} />}
          accent={RISK_STYLES[overallLevel].text}
        />
        <StatCard
          label="Locations Monitored"
          value={locations.length}
          sub="Active sensors"
          icon={<MapPin size={18} />}
        />
        <StatCard
          label="Exposed Population"
          value={totalPop.toLocaleString('en-IN')}
          sub="Across NER"
          icon={<Users size={18} />}
          accent="text-orange-600"
        />
        <StatCard
          label="Critical Infrastructure"
          value={totalInfra}
          sub="At-risk assets"
          icon={<Building2 size={18} />}
          accent="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Left: Overall + selected detail */}
        <div className="space-y-4 xl:col-span-2">
          {/* Overall risk gauge + alert summary */}
          <Card className="p-5">
            <SectionHeader
              title="NER Overall Risk Assessment"
              subtitle="Aggregate threat level across all monitored zones"
              icon={<Activity size={18} />}
            />
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <RiskGauge score={avgRisk} level={overallLevel} size={180} />
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-red-600">Critical Alerts</p>
                    <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
                  </div>
                  <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-orange-600">Active Alerts</p>
                    <p className="text-2xl font-bold text-orange-600">{activeAlerts.length}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-300 bg-white/50 p-3">
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">
                    Risk Distribution
                  </p>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-200">
                    {(['CRITICAL', 'HIGH', 'MEDIUM', 'MODERATE', 'LOW'] as const).map((lvl) => {
                      const count = locations.filter(
                        (l) => l.latest_prediction?.risk_level === lvl,
                      ).length;
                      const pct = (count / locations.length) * 100;
                      if (pct === 0) return null;
                      return (
                        <div
                          key={lvl}
                          className={RISK_STYLES[lvl].dot}
                          style={{ width: `${pct}%` }}
                          title={`${lvl}: ${count}`}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[10px]">
                    {(['CRITICAL', 'HIGH', 'MEDIUM', 'MODERATE', 'LOW'] as const).map((lvl) => (
                      <span key={lvl} className="flex items-center gap-1 text-slate-500">
                        <span className={`h-2 w-2 rounded-full ${RISK_STYLES[lvl].dot}`} />
                        {lvl} ({locations.filter((l) => l.latest_prediction?.risk_level === lvl).length})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Hotspot list */}
          <Card className="p-5">
            <SectionHeader
              title="Monitored Hotspots"
              subtitle="Select a location to update the dashboard"
              icon={<MapPin size={18} />}
            />
            <div className="space-y-2">
              {locations.map((loc) => {
                const pred = loc.latest_prediction;
                const level = pred?.risk_level ?? 'LOW';
                const s = RISK_STYLES[level];
                const isSelected = loc.id === selected?.id;
                return (
                  <button
                    key={loc.id}
                    onClick={() => onSelectLocation(loc.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? `${s.bg} ${s.border} ring-1 ${s.ring}`
                        : 'border-slate-200 bg-white/50 hover:border-slate-300'
                    }`}
                  >
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${s.bg} ${s.border} border`}>
                      <Mountain size={20} className={s.text} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{loc.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {loc.state} · Pop {loc.exposed_population.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="hidden items-center gap-4 text-xs sm:flex">
                      <div className="flex items-center gap-1 text-blue-600">
                        <CloudRain size={14} />
                        {pred?.rainfall_24h?.toFixed(1) ?? '—'}mm
                      </div>
                      <div className="flex items-center gap-1 text-cyan-600">
                        <Droplets size={14} />
                        {pred?.soil_moisture?.toFixed(0) ?? '—'}%
                      </div>
                      <div className={`flex items-center gap-1 ${s.text}`}>
                        <TrendingUp size={14} />
                        {pred?.risk_score?.toFixed(0) ?? '—'}
                      </div>
                    </div>
                    <RiskBadge level={level} />
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right: Active alerts + Intel feed */}
        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeader
              title="Active Alerts"
              subtitle={`${activeAlerts.length} requiring attention`}
              icon={<AlertTriangle size={18} />}
            />
            {activeAlerts.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">No active alerts. All clear.</p>
            ) : (
              <ul className="space-y-2">
                {activeAlerts.slice(0, 5).map((a) => {
                  const lvl = a.severity as 'MEDIUM' | 'HIGH' | 'CRITICAL';
                  const s = RISK_STYLES[lvl];
                  return (
                    <li
                      key={a.id}
                      className={`rounded-lg border p-3 ${s.bg} ${s.border}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">
                          {a.location_name}
                        </span>
                        <RiskBadge level={lvl} />
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{a.reason}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <IntelFeed events={feedEvents} />
        </div>
      </div>
    </div>
  );
}
