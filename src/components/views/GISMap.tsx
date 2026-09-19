import { useMemo, useState } from 'react';
import { MapPin, Crosshair, Layers, Mountain, FileText, Maximize2 } from 'lucide-react';
import { Card, SectionHeader } from '@/components/ui/Card';
import { RiskBadge } from '@/components/ui/Badge';
import { LoadingState, ErrorState } from '@/components/ui/State';
import { riskHex, RISK_STYLES } from '@/lib/risk';
import type { Alert, FieldReport, LocationWithRisk } from '@/types';

interface GISMapProps {
  locations: LocationWithRisk[];
  loading: boolean;
  error: string | null;
  alerts: Alert[];
  reports: FieldReport[];
  selectedId: string | null;
  onSelectLocation: (id: string) => void;
  onRetry: () => void;
}

export function GISMap({
  locations,
  loading,
  error,
  alerts,
  reports,
  selectedId,
  onSelectLocation,
  onRetry,
}: GISMapProps) {
  const [showReports, setShowReports] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);

  if (loading) return <LoadingState message="Loading GIS data…" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!locations || locations.length === 0)
    return <ErrorState message="No map data available." onRetry={onRetry} />;

  // Normalize coordinates to fit our SVG viewport
  const lats = locations.map((l) => l.latitude);
  const lngs = locations.map((l) => l.longitude);
  const minLat = Math.min(...lats) - 0.5;
  const maxLat = Math.max(...lats) + 0.5;
  const minLng = Math.min(...lngs) - 0.5;
  const maxLng = Math.max(...lngs) + 0.5;

  const W = 1000;
  const H = 600;

  const project = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * (W - 120) + 60;
    const y = H - ((lat - minLat) / (maxLat - minLat)) * (H - 120) - 60;
    return { x, y };
  };

  const selected = locations.find((l) => l.id === selectedId) ?? locations[0];

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="Live GIS Map — NER Sector"
          subtitle="Geospatial visualization of risk hotspots, alerts & field reports"
          icon={<MapPin size={18} />}
          right={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAlerts((s) => !s)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  showAlerts
                    ? 'border-orange-500/40 bg-orange-500/10 text-orange-600'
                    : 'border-slate-300 text-slate-500'
                }`}
              >
                <Layers size={14} />
                Alerts
              </button>
              <button
                onClick={() => setShowReports((s) => !s)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  showReports
                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-600'
                    : 'border-slate-300 text-slate-500'
                }`}
              >
                <FileText size={14} />
                Reports
              </button>
            </div>
          }
        />

        {/* Map canvas */}
        <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-slate-100">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-full w-full"
            style={{ minHeight: '400px', maxHeight: '600px' }}
          >
            {/* Grid background */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
              </pattern>
              <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width={W} height={H} fill="url(#grid)" />

            {/* NER outline (approximate) */}
            <path
              d="M 80,400 Q 200,300 350,250 Q 500,200 700,220 Q 850,260 920,350 Q 950,450 850,500 Q 700,540 500,530 Q 300,520 150,490 Q 80,460 80,400 Z"
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity="0.6"
            />
            <text x="500" y="180" fill="#64748b" fontSize="20" textAnchor="middle" fontWeight="bold">
              NORTH EASTERN REGION · INDIA
            </text>

            {/* Connection lines between hotspots */}
            {locations.map((loc, i) => {
              if (i === 0) return null;
              const prev = project(locations[i - 1].latitude, locations[i - 1].longitude);
              const curr = project(loc.latitude, loc.longitude);
              return (
                <line
                  key={`line-${loc.id}`}
                  x1={prev.x}
                  y1={prev.y}
                  x2={curr.x}
                  y2={curr.y}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.4"
                />
              );
            })}

            {/* Alert zones */}
            {showAlerts &&
              alerts
                .filter((a) => a.status === 'ACTIVE')
                .map((a) => {
                  const loc = locations.find((l) => l.id === a.location_id);
                  if (!loc) return null;
                  const { x, y } = project(loc.latitude, loc.longitude);
                  const color = riskHex(a.severity as 'MEDIUM' | 'HIGH' | 'CRITICAL');
                  return (
                    <circle
                      key={`alert-${a.id}`}
                      cx={x}
                      cy={y}
                      r="50"
                      fill={color}
                      opacity="0.08"
                      className="animate-pulse"
                    />
                  );
                })}

            {/* Report markers */}
            {showReports &&
              reports.map((r) => {
                const loc = locations.find((l) => l.id === r.location_id);
                if (!loc) return null;
                const { x, y } = project(loc.latitude, loc.longitude);
                return (
                  <g key={`report-${r.id}`}>
                    <rect x={x + 12} y={y - 22} width="10" height="10" rx="2" fill="#3b82f6" opacity="0.8" />
                  </g>
                );
              })}

            {/* Location hotspots */}
            {locations.map((loc) => {
              const { x, y } = project(loc.latitude, loc.longitude);
              const pred = loc.latest_prediction;
              const level = pred?.risk_level ?? 'LOW';
              const color = riskHex(level);
              const isSelected = loc.id === selected?.id;
              const score = pred?.risk_score ?? 0;
              const radius = 12 + (score / 100) * 10;

              return (
                <g
                  key={loc.id}
                  onClick={() => onSelectLocation(loc.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Glow */}
                  <circle cx={x} cy={y} r={radius + 20} fill={color} opacity="0.1" />
                  {/* Pulse ring for HIGH/CRITICAL */}
                  {(level === 'HIGH' || level === 'CRITICAL') && (
                    <circle
                      cx={x}
                      cy={y}
                      r={radius + 8}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      opacity="0.5"
                      className="animate-ping"
                      style={{ animationDuration: '2s' }}
                    />
                  )}
                  {/* Main marker */}
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill={color}
                    stroke={isSelected ? '#06b6d4' : '#ffffff'}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  <text x={x} y={y + 4} fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                    {Math.round(score)}
                  </text>
                  {/* Label */}
                  <text
                    x={x}
                    y={y + radius + 18}
                    fill={isSelected ? '#06b6d4' : '#94a3b8'}
                    fontSize="13"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {loc.name.length > 30 ? loc.name.slice(0, 28) + '…' : loc.name}
                  </text>
                  {/* Selected crosshair */}
                  {isSelected && (
                    <g stroke="#06b6d4" strokeWidth="1.5" opacity="0.6">
                      <line x1={x - 30} y1={y} x2={x - radius - 4} y2={y} />
                      <line x1={x + radius + 4} y1={y} x2={x + 30} y2={y} />
                      <line x1={x} y1={y - 30} x2={x} y2={y - radius - 4} />
                      <line x1={x} y1={y + radius + 4} x2={x} y2={y + 30} />
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Legend overlay */}
          <div className="absolute bottom-3 left-3 rounded-lg border border-slate-300 bg-white/90 p-3 backdrop-blur">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Risk Levels
            </p>
            <div className="space-y-1">
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'MODERATE', 'LOW'] as const).map((lvl) => (
                <div key={lvl} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: riskHex(lvl) }}
                  />
                  <span className="text-slate-600">{lvl}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Coords overlay */}
          <div className="absolute right-3 top-3 rounded-lg border border-slate-300 bg-white/90 px-3 py-1.5 text-[10px] text-slate-500 backdrop-blur">
            <span className="flex items-center gap-1.5">
              <Crosshair size={12} className="text-cyan-600" />
              {selected.latitude.toFixed(4)}°N, {selected.longitude.toFixed(4)}°E
            </span>
          </div>
        </div>
      </Card>

      {/* Selected location detail strip */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600">
              <Mountain size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{selected.name}</p>
              <p className="text-xs text-slate-500">{selected.state}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-500">
              Risk Score: <span className="font-bold text-slate-900">{selected.latest_prediction?.risk_score ?? '—'}</span>
            </span>
            <RiskBadge level={selected.latest_prediction?.risk_level ?? 'LOW'} />
            <span className="text-xs text-slate-500">
              Pop: <span className="font-bold text-slate-900">{selected.exposed_population.toLocaleString('en-IN')}</span>
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
