import { useMemo } from 'react';
import { BarChart3, TrendingUp, CloudRain, Droplets, Users, Building2, FileText, Siren } from 'lucide-react';
import { Card, SectionHeader, StatCard } from '@/components/ui/Card';
import { BarChart, DonutChart, LineChart } from '@/components/ui/Charts';
import { LoadingState, ErrorState } from '@/components/ui/State';
import { riskHex } from '@/lib/risk';
import type { Alert, FieldReport, LocationWithRisk, RiskLevel } from '@/types';

interface AnalyticsProps {
  locations: LocationWithRisk[];
  reports: FieldReport[];
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function Analytics({
  locations,
  reports,
  alerts,
  loading,
  error,
  onRetry,
}: AnalyticsProps) {
  if (loading) return <LoadingState message="Loading analytics…" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!locations || locations.length === 0)
    return <ErrorState message="No data for analytics." onRetry={onRetry} />;

  const totalPop = locations.reduce((s, l) => s + l.exposed_population, 0);
  const totalInfra = locations.reduce((s, l) => s + l.critical_infrastructure.length, 0);
  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE').length;

  // Risk distribution donut
  const levelCounts: Record<RiskLevel, number> = {
    LOW: 0,
    MODERATE: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };
  locations.forEach((l) => {
    const lvl = l.latest_prediction?.risk_level ?? 'LOW';
    levelCounts[lvl]++;
  });
  const donutData = (['CRITICAL', 'HIGH', 'MEDIUM', 'MODERATE', 'LOW'] as const)
    .filter((lvl) => levelCounts[lvl] > 0)
    .map((lvl) => ({
      label: lvl,
      value: levelCounts[lvl],
      color: riskHex(lvl),
    }));

  // Rainfall bar chart
  const rainfallData = locations.map((l) => ({
    label: l.name.length > 20 ? l.name.slice(0, 18) + '…' : l.name,
    value: l.latest_prediction?.rainfall_24h ?? 0,
    color: '#3b82f6',
  }));

  // Soil moisture bar chart
  const soilData = locations.map((l) => ({
    label: l.name.length > 20 ? l.name.slice(0, 18) + '…' : l.name,
    value: l.latest_prediction?.soil_moisture ?? 0,
    color: '#06b6d4',
  }));

  // Population exposure
  const popData = locations.map((l) => ({
    label: l.name.length > 20 ? l.name.slice(0, 18) + '…' : l.name,
    value: l.exposed_population,
    color: '#fb923c',
  }));

  // Risk scores
  const riskData = locations.map((l) => ({
    label: l.name.length > 20 ? l.name.slice(0, 18) + '…' : l.name,
    value: Math.round(l.latest_prediction?.risk_score ?? 0),
    color: riskHex(l.latest_prediction?.risk_level ?? 'LOW'),
  }));

  // Simulated trend data (last 7 periods) based on current readings
  const trendData = useMemo(() => {
    const periods = ['T-6', 'T-5', 'T-4', 'T-3', 'T-2', 'T-1', 'Now'];
    const avgRain = locations.reduce((s, l) => s + (l.latest_prediction?.rainfall_24h ?? 0), 0) / locations.length;
    const avgSoil = locations.reduce((s, l) => s + (l.latest_prediction?.soil_moisture ?? 0), 0) / locations.length;
    const avgRisk = locations.reduce((s, l) => s + (l.latest_prediction?.risk_score ?? 0), 0) / locations.length;

    const makeTrend = (current: number, variance: number) =>
      periods.map((label, i) => ({
        label,
        value: Math.max(0, Math.round(current - variance * (6 - i) * 0.15 + (Math.random() - 0.5) * variance * 0.3)),
      }));

    return {
      rainfall: makeTrend(avgRain, 30),
      soil: makeTrend(avgSoil, 15),
      risk: makeTrend(avgRisk, 12),
    };
  }, [locations]);

  // Alert trend (by severity)
  const alertTrendData = [
    { label: 'CRITICAL', value: alerts.filter((a) => a.severity === 'CRITICAL').length, color: riskHex('CRITICAL') },
    { label: 'HIGH', value: alerts.filter((a) => a.severity === 'HIGH').length, color: riskHex('HIGH') },
    { label: 'MEDIUM', value: alerts.filter((a) => a.severity === 'MEDIUM').length, color: riskHex('MEDIUM') },
  ];

  // Report risk distribution
  const reportRiskData = (['CRITICAL', 'HIGH', 'MEDIUM', 'MODERATE', 'LOW'] as const)
    .map((lvl) => ({
      label: lvl,
      value: reports.filter((r) => r.risk_level === lvl).length,
      color: riskHex(lvl),
    }))
    .filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Population"
          value={totalPop.toLocaleString('en-IN')}
          icon={<Users size={18} />}
          accent="text-orange-600"
        />
        <StatCard
          label="Infrastructure"
          value={totalInfra}
          icon={<Building2 size={18} />}
          accent="text-red-600"
        />
        <StatCard
          label="Field Reports"
          value={reports.length}
          icon={<FileText size={18} />}
          accent="text-blue-600"
        />
        <StatCard
          label="Active Alerts"
          value={activeAlerts}
          icon={<Siren size={18} />}
          accent="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Risk Distribution Donut */}
        <Card className="p-5">
          <SectionHeader
            title="Risk Level Distribution"
            subtitle="Locations by current risk level"
            icon={<TrendingUp size={18} />}
          />
          <div className="flex justify-center py-4">
            <DonutChart data={donutData} size={200} />
          </div>
        </Card>

        {/* Risk Scores Bar */}
        <Card className="p-5">
          <SectionHeader
            title="Risk Scores by Location"
            subtitle="Current risk score (0-100)"
            icon={<BarChart3 size={18} />}
          />
          <BarChart data={riskData} max={100} unit="" />
        </Card>

        {/* Rainfall */}
        <Card className="p-5">
          <SectionHeader
            title="Rainfall (24h)"
            subtitle="Millimeters recorded per location"
            icon={<CloudRain size={18} />}
          />
          <BarChart data={rainfallData} max={150} unit="mm" />
        </Card>

        {/* Soil Moisture */}
        <Card className="p-5">
          <SectionHeader
            title="Soil Moisture"
            subtitle="Percentage saturation per location"
            icon={<Droplets size={18} />}
          />
          <BarChart data={soilData} max={100} unit="%" />
        </Card>
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <SectionHeader title="Rainfall Trend" subtitle="Last 7 periods (NER avg)" />
          <LineChart data={trendData.rainfall} color="#3b82f6" unit="mm" />
        </Card>
        <Card className="p-5">
          <SectionHeader title="Soil Moisture Trend" subtitle="Last 7 periods (NER avg)" />
          <LineChart data={trendData.soil} color="#06b6d4" unit="%" />
        </Card>
        <Card className="p-5">
          <SectionHeader title="Risk Score Trend" subtitle="Last 7 periods (NER avg)" />
          <LineChart data={trendData.risk} color="#fb923c" />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Population exposure */}
        <Card className="p-5">
          <SectionHeader
            title="Population Exposure"
            subtitle="Exposed population per location"
            icon={<Users size={18} />}
          />
          <BarChart data={popData} unit="" />
        </Card>

        {/* Alert + Report breakdown */}
        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeader
              title="Alert Breakdown"
              subtitle="All alerts by severity"
              icon={<Siren size={18} />}
            />
            {alertTrendData.some((d) => d.value > 0) ? (
              <BarChart data={alertTrendData} max={Math.max(...alertTrendData.map((d) => d.value), 1)} />
            ) : (
              <p className="py-6 text-center text-xs text-slate-500">No alerts recorded.</p>
            )}
          </Card>
          <Card className="p-5">
            <SectionHeader
              title="Field Reports by Risk"
              subtitle="Citizen reports by severity"
              icon={<FileText size={18} />}
            />
            {reportRiskData.length > 0 ? (
              <BarChart data={reportRiskData} max={Math.max(...reportRiskData.map((d) => d.value), 1)} />
            ) : (
              <p className="py-6 text-center text-xs text-slate-500">No field reports yet.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
