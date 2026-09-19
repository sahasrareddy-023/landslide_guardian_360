import { useEffect, useRef, useState, useCallback } from 'react';
import {
  CloudRain,
  Droplets,
  Activity,
  Radio,
  Satellite,
  Thermometer,
  Gauge,
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Cpu,
  Bell,
  Clock,
  MapPin,
} from 'lucide-react';
import { Card, SectionHeader, StatCard } from '@/components/ui/Card';
import { RiskBadge } from '@/components/ui/Badge';
import { RiskGauge } from '@/components/ui/RiskGauge';
import { LoadingState, ErrorState } from '@/components/ui/State';
import { RISK_STYLES, scoreToLevel, formatTime } from '@/lib/risk';
import {
  getSensorSources,
  generateSensorReading,
  predictFutureRisk,
  getThresholdForScore,
  shouldAutoAlert,
  generateReport,
  type PredictionResult,
  type SensorReading,
  type GeneratedReport,
  type FactorContribution,
} from '@/lib/predictionEngine';
import type { Alert, IntelFeedEvent, LocationWithRisk } from '@/types';

interface PredictiveAnalyticsProps {
  locations: LocationWithRisk[];
  loading: boolean;
  error: string | null;
  alerts: Alert[];
  selectedId: string | null;
  onSelectLocation: (id: string) => void;
  onAutoAlert: (a: {
    location_id: string | null;
    location_name: string;
    severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reason: string;
    recommended_response: string;
  }) => Promise<{ error: string | null }>;
  addFeedEvent: (ev: IntelFeedEvent) => void;
  onRetry: () => void;
}

export function PredictiveAnalytics({
  locations,
  loading,
  error,
  alerts,
  selectedId,
  onSelectLocation,
  onAutoAlert,
  addFeedEvent,
  onRetry,
}: PredictiveAnalyticsProps) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [streaming, setStreaming] = useState(true);
  const [autoAlerted, setAutoAlerted] = useState(false);
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScoreRef = useRef(0);

  const loc = locations.find((l) => l.id === selectedId) ?? locations[0];

  // Reset state when location changes
  useEffect(() => {
    setReadings([]);
    setPrediction(null);
    setReport(null);
    setAutoAlerted(false);
    lastScoreRef.current = 0;
  }, [selectedId]);

  // Sensor stream simulation — generates a new reading every 3 seconds
  const runPrediction = useCallback(() => {
    if (!loc?.latest_prediction) return;

    const reading = generateSensorReading(loc.latest_prediction);
    const newReadings = [...readings, reading].slice(-20);
    setReadings(newReadings);

    const result = predictFutureRisk(loc, newReadings);
    setPrediction(result);

    // Automated alert check — if risk crosses threshold upward
    if (lastScoreRef.current > 0) {
      const { shouldAlert, threshold } = shouldAutoAlert(lastScoreRef.current, result.predictedScore);
      if (shouldAlert && threshold && !autoAlerted) {
        setAutoAlerted(true);
        onAutoAlert({
          location_id: loc.id,
          location_name: loc.name,
          severity: threshold.level === 'CRITICAL' ? 'CRITICAL' : threshold.level === 'HIGH' ? 'HIGH' : 'MEDIUM',
          reason: `AUTO-ALERT: Risk score crossed ${threshold.level} threshold (${result.predictedScore}). Predicted escalation from ${result.currentLevel} to ${result.predictedLevel} within ${result.timeframe}.`,
          recommended_response: threshold.action,
        }).then(({ error: err }) => {
          if (!err) {
            addFeedEvent({
              id: `ev-auto-${Date.now()}`,
              timestamp: Date.now(),
              type: 'alert',
              message: `AUTO-ALERT: ${loc.name} crossed ${threshold.level} threshold — ${threshold.notifyAuthority} notified`,
              severity: threshold.level as IntelFeedEvent['severity'],
            });
          }
        });
      }
    }
    lastScoreRef.current = result.predictedScore;
  }, [loc, readings, autoAlerted, onAutoAlert, addFeedEvent]);

  useEffect(() => {
    if (!loc?.latest_prediction || !streaming) return;

    // Initial prediction immediately
    runPrediction();

    // Then stream every 3 seconds
    streamTimer.current = setInterval(runPrediction, 3000);

    return () => {
      if (streamTimer.current) clearInterval(streamTimer.current);
    };
  }, [loc?.id, streaming, runPrediction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamTimer.current) clearInterval(streamTimer.current);
    };
  }, []);

  const handleGenerateReport = () => {
    if (!loc || !prediction) return;
    const lastReading = readings[readings.length - 1];
    const rpt = generateReport(loc, prediction, alerts, lastReading?.groundMovement ?? 0);
    setReport(rpt);
    addFeedEvent({
      id: `ev-rpt-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      message: `Automated report generated for ${loc.name}`,
      severity: 'INFO',
    });
  };

  if (loading) return <LoadingState message="Loading prediction engine…" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!locations || locations.length === 0)
    return <ErrorState message="No location data available." onRetry={onRetry} />;
  if (!loc?.latest_prediction)
    return <ErrorState message={`No risk data for ${loc?.name ?? 'this location'}.`} onRetry={onRetry} />;

  const sensors = getSensorSources();
  const threshold = prediction ? getThresholdForScore(prediction.predictedScore) : null;

  return (
    <div className="space-y-4">
      {/* Pipeline header */}
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600">
              <Cpu size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Predictive Analytics Engine</h3>
              <p className="text-xs text-slate-500">
                Real-time sensor fusion → ML risk prediction → XAI explanation → automated response
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStreaming((s) => !s)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                streaming
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                  : 'border-slate-300 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {streaming ? <Activity size={14} /> : <Minus size={14} />}
              {streaming ? 'Streaming' : 'Paused'}
            </button>
            <button
              onClick={handleGenerateReport}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
            >
              <FileText size={14} />
              Generate Report
            </button>
          </div>
        </div>

        {/* Pipeline flow diagram */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
          <PipelineNode label="Sensors" icon={<Radio size={14} />} color="text-blue-600" />
          <ArrowRight size={14} className="text-slate-400" />
          <PipelineNode label="Data Processing" icon={<Cpu size={14} />} color="text-cyan-600" />
          <ArrowRight size={14} className="text-slate-400" />
          <PipelineNode label="ML Prediction" icon={<Brain size={14} />} color="text-purple-600" />
          <ArrowRight size={14} className="text-slate-400" />
          <PipelineNode label="XAI Explanation" icon={<Gauge size={14} />} color="text-orange-600" />
          <ArrowRight size={14} className="text-slate-400" />
          <PipelineNode label="Auto Alert" icon={<Bell size={14} />} color="text-red-600" />
          <ArrowRight size={14} className="text-slate-400" />
          <PipelineNode label="Dashboard" icon={<Activity size={14} />} color="text-emerald-600" />
        </div>
      </Card>

      {/* Location selector mini-bar */}
      <div className="flex flex-wrap items-center gap-2">
        {locations.map((l) => {
          const level = l.latest_prediction?.risk_level ?? 'LOW';
          const isSelected = l.id === loc.id;
          return (
            <button
              key={l.id}
              onClick={() => onSelectLocation(l.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                isSelected
                  ? `${RISK_STYLES[level].bg} ${RISK_STYLES[level].border} ${RISK_STYLES[level].text} ring-1 ${RISK_STYLES[level].ring}`
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${RISK_STYLES[level].dot}`} />
              {l.name.length > 25 ? l.name.slice(0, 23) + '…' : l.name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Sensor sources + live readings */}
        <div className="space-y-4">
          {/* Sensor sources */}
          <Card className="p-5">
            <SectionHeader
              title="Sensor Data Sources"
              subtitle="Multi-source data fusion pipeline"
              icon={<Radio size={18} />}
            />
            <div className="space-y-2">
              {sensors.map((sensor) => (
                <div
                  key={sensor.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/50 p-2.5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                    <SensorIcon type={sensor.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-700">{sensor.name}</p>
                    <p className="text-[10px] text-slate-400">Last: {sensor.lastReading}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-600">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    {sensor.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Live sensor readings */}
          <Card className="p-5">
            <SectionHeader
              title="Live Sensor Stream"
              subtitle={streaming ? 'Receiving data every 3s' : 'Stream paused'}
              icon={<Activity size={18} />}
            />
            {readings.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">Waiting for sensor data…</p>
            ) : (
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {readings.slice(-8).reverse().map((r, i) => (
                  <div
                    key={r.timestamp}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px]"
                  >
                    <span className="text-slate-400">
                      {new Date(r.timestamp).toLocaleTimeString('en-IN', { hour12: false })}
                    </span>
                    <span className="flex items-center gap-0.5 text-blue-600">
                      <CloudRain size={10} /> {r.rainfall.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-0.5 text-cyan-600">
                      <Droplets size={10} /> {r.soilMoisture.toFixed(0)}%
                    </span>
                    <span className="flex items-center gap-0.5 text-orange-600">
                      <Activity size={10} /> {r.groundMovement.toFixed(2)}mm
                    </span>
                    <span className="flex items-center gap-0.5 text-slate-500">
                      <Thermometer size={10} /> {r.temperature.toFixed(0)}°C
                    </span>
                    {i === 0 && (
                      <span className="ml-auto rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                        NEW
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Middle: Current vs Predicted */}
        <div className="space-y-4">
          <Card className="flex flex-col items-center p-5">
            <SectionHeader title="Risk Prediction" icon={<Gauge size={18} />} />
            {prediction ? (
              <>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center">
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">Current</p>
                    <RiskGauge score={prediction.currentScore} level={prediction.currentLevel} size={120} showLabel={false} />
                    <RiskBadge level={prediction.currentLevel} size="sm" />
                  </div>
                  <div className="flex flex-col items-center">
                    <ArrowRight size={28} className="text-slate-400" />
                    <span className="mt-1 text-[10px] text-slate-400">{prediction.timeframe}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">Predicted</p>
                    <RiskGauge score={prediction.predictedScore} level={prediction.predictedLevel} size={120} showLabel={false} />
                    <RiskBadge level={prediction.predictedLevel} size="sm" />
                  </div>
                </div>

                {/* Trend indicator */}
                <div className={`mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  prediction.trendDirection === 'escalating'
                    ? 'border-red-500/30 bg-red-500/10 text-red-600'
                    : prediction.trendDirection === 'decreasing'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                      : 'border-slate-300 bg-slate-50 text-slate-500'
                }`}>
                  {prediction.trendDirection === 'escalating' ? <TrendingUp size={16} /> : prediction.trendDirection === 'decreasing' ? <TrendingDown size={16} /> : <Minus size={16} />}
                  <span className="text-xs font-bold capitalize">{prediction.trendDirection}</span>
                  <span className="text-xs text-slate-400">
                    {prediction.probability}% probability · {prediction.timeframe}
                  </span>
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-xs text-slate-400">Computing prediction…</p>
            )}
          </Card>

          {/* Threshold action */}
          {threshold && prediction && (
            <Card className="p-5">
              <SectionHeader
                title="Automated Alert Threshold"
                subtitle="Action triggered when risk crosses threshold"
                icon={<Bell size={18} />}
              />
              <div className={`rounded-lg border p-3 ${RISK_STYLES[threshold.level].bg} ${RISK_STYLES[threshold.level].border}`}>
                <div className="flex items-center justify-between">
                  <RiskBadge level={threshold.level} size="md" />
                  {autoAlerted && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-600">
                      <AlertTriangle size={12} /> ALERT SENT
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-600">{threshold.action}</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                  <Bell size={10} /> Notify: {threshold.notifyAuthority}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right: XAI + GenAI Summary */}
        <div className="space-y-4">
          {prediction && (
            <>
              {/* Explainable AI — Factor contributions */}
              <Card className="p-5">
                <SectionHeader
                  title="Explainable AI (XAI)"
                  subtitle="Why this risk level? Factor contributions"
                  icon={<Brain size={18} />}
                />
                <div className="space-y-2">
                  {prediction.factors.map((f, i) => (
                    <FactorBar key={i} factor={f} />
                  ))}
                </div>
              </Card>

              {/* GenAI Summary */}
              <Card className="p-5">
                <SectionHeader
                  title="AI Risk Summary"
                  subtitle="Generated natural-language summary"
                  icon={<FileText size={18} />}
                />
                <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
                  <p className="text-sm leading-relaxed text-slate-700">{prediction.summary}</p>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                  <Cpu size={10} /> Predicted using {readings.length} sensor readings · {prediction.confidence}% confidence
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Generated Report */}
      {report && (
        <Card className="p-5">
          <SectionHeader
            title="Generated Landslide Risk Report"
            subtitle={`Report ID: ${report.id} · Generated ${formatTime(report.generatedAt)}`}
            icon={<FileText size={18} />}
            right={
              <button
                onClick={() => {
                  const blob = new Blob([formatReportAsText(report)], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `landslide-risk-report-${report.locationName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <Download size={14} />
                Download
              </button>
            }
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <ReportRow label="Location" value={`${report.locationName}, ${report.state}`} icon={<MapPin size={14} />} />
              <ReportRow label="Current Risk" value={`${report.currentRiskLevel} (Score: ${report.currentRiskScore})`} icon={<Gauge size={14} />} />
              <ReportRow label="Predicted Risk" value={`${report.predictedRiskLevel} (Score: ${report.predictedRiskScore})`} icon={<TrendingUp size={14} />} />
              <ReportRow label="Trend" value={`${report.trendDirection} · ${report.probability}% probability · ${report.timeframe}`} icon={<Activity size={14} />} />
              <ReportRow label="Rainfall" value={`${report.rainfall.toFixed(1)} mm/24h`} icon={<CloudRain size={14} />} />
              <ReportRow label="Soil Moisture" value={`${report.soilMoisture.toFixed(0)}%`} icon={<Droplets size={14} />} />
              <ReportRow label="Slope Angle" value={`${report.slopeAngle.toFixed(0)}°`} icon={<Activity size={14} />} />
              <ReportRow label="Ground Movement" value={`${report.groundMovement.toFixed(2)} mm/day`} icon={<Activity size={14} />} />
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Contributing Factors</p>
                <div className="space-y-1">
                  {report.contributingFactors.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{f.factor}</span>
                      <span className="font-bold text-slate-700">{f.contribution} ({f.weight}%)</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Alert History</p>
                {report.alertHistory.length === 0 ? (
                  <p className="text-xs text-slate-400">No alerts for this location.</p>
                ) : (
                  <div className="space-y-1">
                    {report.alertHistory.map((a, i) => (
                      <div key={i} className="text-xs text-slate-600">
                        <span className="font-semibold">{a.severity}</span> — {a.reason.slice(0, 60)}…
                        <span className="text-slate-400"> ({a.status})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Recommended Actions</p>
                <div className="space-y-1">
                  {report.recommendedActions.map((a, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                      <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-600" />
                      {a}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-cyan-600">AI Summary</p>
                <p className="text-xs leading-relaxed text-slate-700">{report.summary}</p>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">Notified Authorities</p>
                <p className="text-xs text-slate-600">{report.notifiedAuthorities}</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Helper components
// ──────────────────────────────────────────────────────────
function PipelineNode({ label, icon, color }: { label: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
      <span className={color}>{icon}</span>
      <span className="text-[11px] font-medium text-slate-600">{label}</span>
    </div>
  );
}

function SensorIcon({ type }: { type: string }) {
  switch (type) {
    case 'rain': return <CloudRain size={16} className="text-blue-600" />;
    case 'soil': return <Droplets size={16} className="text-cyan-600" />;
    case 'inclinometer': return <Activity size={16} className="text-orange-600" />;
    case 'weather': return <Thermometer size={16} className="text-purple-600" />;
    case 'sar': return <Satellite size={16} className="text-emerald-600" />;
    default: return <Radio size={16} className="text-slate-500" />;
  }
}

function FactorBar({ factor }: { factor: FactorContribution }) {
  const colors: Record<string, string> = {
    'Very High': 'bg-red-500',
    'High': 'bg-orange-500',
    'Moderate': 'bg-yellow-500',
    'Low': 'bg-emerald-500',
    'Minimal': 'bg-slate-400',
  };
  const dirIcon = factor.direction === 'up' ? <TrendingUp size={10} className="text-red-500" /> : factor.direction === 'down' ? <TrendingDown size={10} className="text-emerald-500" /> : <Minus size={10} className="text-slate-400" />;

  return (
    <div className="rounded-lg border border-slate-200 bg-white/50 p-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          {dirIcon}
          {factor.factor}
        </span>
        <span className="text-[10px] font-bold text-slate-500">{factor.contribution} · {factor.weight}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colors[factor.contribution]}`}
          style={{ width: `${factor.weight}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-slate-400">{factor.value}</p>
    </div>
  );
}

function ReportRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/50 px-3 py-2">
      <span className="flex items-center gap-2 text-xs text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </span>
      <span className="text-xs font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function formatReportAsText(r: GeneratedReport): string {
  const lines = [
    '═══════════════════════════════════════════════════════════',
    '     LANDSLIDE GUARDIAN 360° — RISK REPORT',
    '═══════════════════════════════════════════════════════════',
    '',
    `Location:           ${r.locationName}, ${r.state}`,
    `Generated At:       ${formatTime(r.generatedAt)}`,
    `Current Risk:       ${r.currentRiskLevel} (Score: ${r.currentRiskScore})`,
    `Predicted Risk:     ${r.predictedRiskLevel} (Score: ${r.predictedRiskScore})`,
    `Trend:              ${r.trendDirection} · ${r.probability}% probability · ${r.timeframe}`,
    '',
    '─── Environmental Conditions ───',
    `Rainfall:           ${r.rainfall.toFixed(1)} mm/24h`,
    `Soil Moisture:      ${r.soilMoisture.toFixed(0)}%`,
    `Slope Angle:        ${r.slopeAngle.toFixed(0)}°`,
    `Ground Movement:    ${r.groundMovement.toFixed(2)} mm/day`,
    '',
    '─── Contributing Factors (XAI) ───',
    ...r.contributingFactors.map(f => `  ${f.factor.padEnd(20)} ${f.contribution.padEnd(12)} ${f.weight}% — ${f.value}`),
    '',
    '─── Alert History ───',
    r.alertHistory.length === 0 ? '  No alerts for this location.' : r.alertHistory.map(a => `  [${a.severity}] ${a.reason} (${a.status})`).join('\n'),
    '',
    '─── Recommended Actions ───',
    ...r.recommendedActions.map((a, i) => `  ${i + 1}. ${a}`),
    '',
    '─── AI Summary ───',
    `  ${r.summary}`,
    '',
    '─── Notified Authorities ───',
    `  ${r.notifiedAuthorities}`,
    '',
    '═══════════════════════════════════════════════════════════',
  ];
  return lines.join('\n');
}
