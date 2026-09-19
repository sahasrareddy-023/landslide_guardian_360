import {
  Brain,
  CloudRain,
  Droplets,
  Mountain,
  TrendingUp,
  Lightbulb,
  CheckCircle2,
  Gauge,
  Clock,
  MapPin,
} from 'lucide-react';
import { Card, SectionHeader, StatCard } from '@/components/ui/Card';
import { RiskBadge } from '@/components/ui/Badge';
import { RiskGauge } from '@/components/ui/RiskGauge';
import { LoadingState, ErrorState } from '@/components/ui/State';
import { formatTime } from '@/lib/risk';
import type { LocationWithRisk } from '@/types';

interface RiskIntelligenceProps {
  locations: LocationWithRisk[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onRetry: () => void;
}

export function RiskIntelligence({
  locations,
  loading,
  error,
  selectedId,
  onRetry,
}: RiskIntelligenceProps) {
  if (loading) return <LoadingState message="Loading risk intelligence…" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!locations || locations.length === 0)
    return <ErrorState message="No location data available." onRetry={onRetry} />;

  const loc = locations.find((l) => l.id === selectedId) ?? locations[0];
  const pred = loc.latest_prediction;

  if (!pred) {
    return (
      <ErrorState message={`No risk prediction available for ${loc.name}.`} onRetry={onRetry} />
    );
  }

  return (
    <div className="space-y-4">
      {/* Location header */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{loc.name}</h3>
              <p className="text-xs text-slate-500">
                {loc.state} · {loc.latitude.toFixed(4)}°N, {loc.longitude.toFixed(4)}°E
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pred.is_demo && (
              <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-600">
                Simulated
              </span>
            )}
            <RiskBadge level={pred.risk_level} size="md" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Risk gauge + confidence */}
        <div className="space-y-4">
          <Card className="flex flex-col items-center p-5">
            <SectionHeader title="Risk Score" icon={<Gauge size={18} />} />
            <RiskGauge score={pred.risk_score} level={pred.risk_level} size={200} />
            <div className="mt-4 w-full space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-white/50 p-3">
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <TrendingUp size={14} className="text-cyan-600" />
                  Confidence
                </span>
                <span className="text-sm font-bold text-cyan-600">
                  {pred.confidence.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-white/50 p-3">
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock size={14} className="text-slate-500" />
                  Last Prediction
                </span>
                <span className="text-xs font-medium text-slate-600">
                  {formatTime(pred.prediction_time)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-white/50 p-3">
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <Mountain size={14} className="text-slate-500" />
                  Historical Events
                </span>
                <span className="text-sm font-bold text-slate-600">
                  {loc.historical_landslides}
                </span>
              </div>
            </div>
          </Card>

          {/* Telemetry */}
          <Card className="p-5">
            <SectionHeader title="Environmental Telemetry" icon={<CloudRain size={18} />} />
            <div className="grid grid-cols-1 gap-3">
              <TelemetryRow
                icon={<CloudRain size={16} />}
                label="Rainfall (24h)"
                value={`${pred.rainfall_24h.toFixed(1)} mm`}
                pct={Math.min((pred.rainfall_24h / 150) * 100, 100)}
                color="bg-blue-500"
              />
              <TelemetryRow
                icon={<Droplets size={16} />}
                label="Soil Moisture"
                value={`${pred.soil_moisture.toFixed(0)}%`}
                pct={pred.soil_moisture}
                color="bg-cyan-500"
              />
              <TelemetryRow
                icon={<Mountain size={16} />}
                label="Slope Angle"
                value={`${pred.slope_angle.toFixed(0)}°`}
                pct={Math.min((pred.slope_angle / 90) * 100, 100)}
                color="bg-orange-500"
              />
            </div>
          </Card>
        </div>

        {/* Middle + Right: Explainable AI + Actions */}
        <div className="space-y-4 lg:col-span-2">
          {/* Explainable AI */}
          <Card className="p-5">
            <SectionHeader
              title="Explainable AI — Why This Risk?"
              subtitle="Key factors driving the current risk assessment"
              icon={<Brain size={18} />}
            />
            <div className="space-y-2">
              {pred.risk_factors.map((factor, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-slate-300 bg-white/50 p-3"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-[10px] font-bold text-cyan-600">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-600">{factor}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Recommended Actions */}
          <Card className="p-5">
            <SectionHeader
              title="Recommended Actions"
              subtitle="Prioritized response based on risk severity"
              icon={<Lightbulb size={18} />}
            />
            <div className="space-y-2">
              {pred.recommended_actions.map((action, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
                >
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  <p className="text-sm text-slate-700">{action}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Infrastructure exposure */}
          <Card className="p-5">
            <SectionHeader
              title="Infrastructure Exposure"
              subtitle="Critical assets at this location"
              icon={<Gauge size={18} />}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard
                label="Population"
                value={loc.exposed_population.toLocaleString('en-IN')}
                accent="text-orange-600"
              />
              <StatCard
                label="Road"
                value={loc.road_exposure === 'None' ? 'None' : 'Exposed'}
                accent={loc.road_exposure === 'None' ? 'text-slate-500' : 'text-red-600'}
                sub={loc.road_exposure === 'None' ? undefined : loc.road_exposure}
              />
              <StatCard
                label="Railway"
                value={loc.railway_exposure === 'None' ? 'None' : 'Exposed'}
                accent={loc.railway_exposure === 'None' ? 'text-slate-500' : 'text-red-600'}
                sub={loc.railway_exposure === 'None' ? undefined : loc.railway_exposure}
              />
            </div>
            {loc.critical_infrastructure.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {loc.critical_infrastructure.map((infra, i) => (
                  <span
                    key={i}
                    className="rounded-lg border border-slate-300 bg-white/70 px-2.5 py-1 text-xs text-slate-600"
                  >
                    {infra}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function TelemetryRow({
  icon,
  label,
  value,
  pct,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-slate-300 bg-white/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs text-slate-500">
          <span className="text-slate-500">{icon}</span>
          {label}
        </span>
        <span className="text-sm font-bold text-slate-900">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
