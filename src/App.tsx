import { useCallback, useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { CommandCenter } from '@/components/views/CommandCenter';
import { RiskIntelligence } from '@/components/views/RiskIntelligence';
import { GISMap } from '@/components/views/GISMap';
import { ImpactMatrix } from '@/components/views/ImpactMatrix';
import { PriorityEngine } from '@/components/views/PriorityEngine';
import { CommunitySentinel } from '@/components/views/CommunitySentinel';
import { AlertCenter } from '@/components/views/AlertCenter';
import { Analytics } from '@/components/views/Analytics';
import {
  useLocations,
  useFieldReports,
  useAlerts,
  useRealtimeRefresh,
  upsertRiskPrediction,
} from '@/hooks/useData';
import { scoreToLevel } from '@/lib/risk';
import { supabase } from '@/lib/supabase';
import type { IntelFeedEvent, ViewKey } from '@/types';

let eventCounter = 0;
function makeEvent(
  type: IntelFeedEvent['type'],
  message: string,
  severity: IntelFeedEvent['severity'] = 'INFO',
): IntelFeedEvent {
  return {
    id: `ev-${++eventCounter}-${Date.now()}`,
    timestamp: Date.now(),
    type,
    message,
    severity,
  };
}

export default function App() {
  const [view, setView] = useState<ViewKey>('command');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [feedEvents, setFeedEvents] = useState<IntelFeedEvent[]>([]);
  const [demoActive, setDemoActive] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoLocId = useRef<string | null>(null);

  // Data hooks
  const locationsState = useLocations();
  const reportsState = useFieldReports();
  const alertsState = useAlerts();

  const { data: locations, loading: locLoading, error: locError, refresh: refreshLoc } = locationsState;
  const { data: reports, loading: repLoading, error: repError, refresh: refreshRep } = reportsState;
  const { data: alerts, loading: alLoading, error: alError, refresh: refreshAl } = alertsState;

  // Realtime: auto-refresh on DB changes
  useRealtimeRefresh('field_reports', refreshRep);
  useRealtimeRefresh('alerts', refreshAl);
  useRealtimeRefresh('risk_predictions', refreshLoc);

  // Initialize selected location when data loads
  useEffect(() => {
    if (locations && locations.length > 0 && !selectedId) {
      setSelectedId(locations[0].id);
    }
  }, [locations, selectedId]);

  // Seed initial feed events when data first loads
  useEffect(() => {
    if (locations && locations.length > 0 && feedEvents.length === 0) {
      const initial: IntelFeedEvent[] = [];
      locations.forEach((l) => {
        const pred = l.latest_prediction;
        if (pred) {
          if (pred.risk_level === 'HIGH' || pred.risk_level === 'CRITICAL') {
            initial.push(
              makeEvent(
                'risk_up',
                `${l.name}: Risk score at ${Math.round(pred.risk_score)} (${pred.risk_level})`,
                pred.risk_level,
              ),
            );
          }
          if (pred.rainfall_24h > 80) {
            initial.push(
              makeEvent(
                'rainfall',
                `${l.name}: Heavy rainfall detected — ${pred.rainfall_24h.toFixed(1)}mm in 24h`,
                'HIGH',
              ),
            );
          }
          if (pred.soil_moisture > 80) {
            initial.push(
              makeEvent(
                'soil',
                `${l.name}: Soil moisture threshold exceeded — ${pred.soil_moisture.toFixed(0)}%`,
                'HIGH',
              ),
            );
          }
        }
      });
      if (alerts && alerts.length > 0) {
        alerts.slice(0, 2).forEach((a) => {
          initial.push(
            makeEvent(
              'alert',
              `Alert: ${a.location_name} — ${a.severity}`,
              a.severity as IntelFeedEvent['severity'],
            ),
          );
        });
      }
      setFeedEvents(initial);
    }
  }, [locations, alerts, feedEvents.length]);

  const addEvent = useCallback((ev: IntelFeedEvent) => {
    setFeedEvents((prev) => [ev, ...prev].slice(0, 50));
  }, []);

  const handleSelectLocation = useCallback(
    (id: string) => {
      setSelectedId(id);
      const loc = locations?.find((l) => l.id === id);
      if (loc) {
        addEvent(
          makeEvent('info', `Operator selected hotspot: ${loc.name}`, 'INFO'),
        );
      }
    },
    [locations, addEvent],
  );

  // ─── Demo Mode ──────────────────────────────────────────
  const runDemo = useCallback(async () => {
    if (demoActive || !locations || locations.length === 0) return;

    // Find the highest-risk location (Teesta Valley)
    const target = [...locations].sort(
      (a, b) =>
        (b.latest_prediction?.risk_score ?? 0) - (a.latest_prediction?.risk_score ?? 0),
    )[0];
    if (!target?.latest_prediction) return;

    demoLocId.current = target.id;
    setSelectedId(target.id);
    setDemoActive(true);
    setDemoStep(0);

    const basePred = target.latest_prediction;
    const steps: {
      rainfall: number;
      soil: number;
      score: number;
      label: string;
      factors: string[];
      actions: string[];
    }[] = [
      {
        rainfall: basePred.rainfall_24h + 20,
        soil: basePred.soil_moisture + 4,
        score: basePred.risk_score + 5,
        label: 'Rainfall intensifying',
        factors: [
          `Rainfall increasing — ${(basePred.rainfall_24h + 20).toFixed(1)}mm in 24h`,
          `Soil saturation rising — ${(basePred.soil_moisture + 4).toFixed(0)}%`,
          ...basePred.risk_factors.slice(2),
        ],
        actions: basePred.recommended_actions,
      },
      {
        rainfall: basePred.rainfall_24h + 45,
        soil: basePred.soil_moisture + 9,
        score: basePred.risk_score + 12,
        label: 'Soil moisture threshold exceeded',
        factors: [
          `Heavy rainfall — ${(basePred.rainfall_24h + 45).toFixed(1)}mm in 24h`,
          `Soil saturation critical — ${(basePred.soil_moisture + 9).toFixed(0)}%`,
          ...basePred.risk_factors.slice(2),
        ],
        actions: [
          'Increase monitoring to 15-minute intervals',
          'Alert district emergency operations center',
          'Pre-position NDRF teams',
          ...basePred.recommended_actions.slice(2),
        ],
      },
      {
        rainfall: basePred.rainfall_24h + 65,
        soil: basePred.soil_moisture + 14,
        score: Math.min(basePred.risk_score + 20, 100),
        label: 'Risk level escalating to CRITICAL',
        factors: [
          `Extreme rainfall — ${(basePred.rainfall_24h + 65).toFixed(1)}mm in 24h`,
          `Soil saturation at ${(basePred.soil_moisture + 14).toFixed(0)}% — slope failure imminent`,
          `Steep slope ${basePred.slope_angle}° with weakened stability`,
          ...basePred.risk_factors.slice(3),
        ],
        actions: [
          'IMMEDIATE EVACUATION of at-risk population',
          'Deploy NDRF and SDRF teams to site',
          'Close NH-10 to all traffic',
          'Activate emergency shelters',
          'Issue public SMS/IVR alerts',
        ],
      },
      {
        rainfall: basePred.rainfall_24h + 80,
        soil: Math.min(basePred.soil_moisture + 18, 98),
        score: Math.min(basePred.risk_score + 24, 100),
        label: 'Critical alert generated',
        factors: [
          `Extreme rainfall — ${(basePred.rainfall_24h + 80).toFixed(1)}mm in 24h`,
          `Soil saturation at ${Math.min(basePred.soil_moisture + 18, 98).toFixed(0)}%`,
          `Slope failure risk at maximum`,
          ...basePred.risk_factors.slice(3),
        ],
        actions: [
          'EVACUATION IN PROGRESS',
          'NDRF teams deployed',
          'NH-10 CLOSED',
          'Emergency shelters active',
          'Continuous monitoring',
        ],
      },
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setDemoStep(i + 1);

      const newScore = step.score;
      const newLevel = scoreToLevel(newScore);

      // Write demo prediction to DB (marked is_demo = true)
      await upsertRiskPrediction(target.id, {
        risk_score: newScore,
        risk_level: newLevel,
        confidence: Math.min(basePred.confidence + 3, 98),
        rainfall_24h: step.rainfall,
        soil_moisture: step.soil,
        slope_angle: basePred.slope_angle,
        risk_factors: step.factors,
        recommended_actions: step.actions,
        is_demo: true,
      });

      addEvent(
        makeEvent('rainfall', `${target.name}: ${step.label}`, newLevel),
      );

      if (i === 1) {
        addEvent(
          makeEvent('soil', `${target.name}: Soil moisture at ${step.soil.toFixed(0)}%`, 'HIGH'),
        );
      }

      if (newLevel === 'CRITICAL' && i >= 2) {
        const { error } = await alertsState.insertAlert({
          location_id: target.id,
          location_name: target.name,
          severity: 'CRITICAL',
          reason: `DEMO: Risk score ${Math.round(newScore)} — extreme rainfall (${step.rainfall.toFixed(1)}mm) and soil saturation (${step.soil.toFixed(0)}%) creating imminent landslide threat.`,
          recommended_response:
            'DEMO SCENARIO: Immediate evacuation, deploy NDRF, close affected roads, activate emergency shelters.',
        });
        if (!error) {
          addEvent(
            makeEvent('alert', `${target.name}: CRITICAL alert generated`, 'CRITICAL'),
          );
        }
      }

      addEvent(
        makeEvent('risk_up', `${target.name}: Risk score → ${Math.round(newScore)} (${newLevel})`, newLevel),
      );

      if (i === steps.length - 1) {
        addEvent(
          makeEvent('priority', `${target.name}: Priority upgraded to PRIORITY 1 — Immediate Action`, 'CRITICAL'),
        );
        addEvent(
          makeEvent('action', `${target.name}: Recommended actions updated — evacuation ordered`, 'CRITICAL'),
        );
      }

      // Wait between steps
      if (i < steps.length - 1) {
        await new Promise((resolve) => {
          demoTimer.current = setTimeout(resolve, 2200);
        });
      }
    }

    setDemoActive(false);
    setDemoStep(0);
    refreshLoc();
  }, [demoActive, locations, alertsState, addEvent, refreshLoc]);

  const resetDemo = useCallback(async () => {
    if (demoTimer.current) {
      clearTimeout(demoTimer.current);
      demoTimer.current = null;
    }
    setDemoActive(false);
    setDemoStep(0);

    // Delete demo-marked predictions and alerts
    await supabase.from('risk_predictions').delete().eq('is_demo', true);
    await supabase.from('alerts').delete().like('reason', 'DEMO%');

    refreshLoc();
    refreshAl();

    addEvent(makeEvent('info', 'Demo reset — application returned to baseline state', 'INFO'));
  }, [refreshLoc, refreshAl, addEvent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (demoTimer.current) clearTimeout(demoTimer.current);
    };
  }, []);

  // Active counts for sidebar badges
  const activeAlertCount = alerts?.filter((a) => a.status === 'ACTIVE').length ?? 0;
  const pendingReportCount = reports?.filter((r) => r.status === 'SUBMITTED').length ?? 0;

  const renderView = () => {
    switch (view) {
      case 'command':
        return (
          <CommandCenter
            locations={locations ?? []}
            loading={locLoading}
            error={locError}
            alerts={alerts ?? []}
            selectedId={selectedId}
            onSelectLocation={handleSelectLocation}
            feedEvents={feedEvents}
            onRetry={refreshLoc}
          />
        );
      case 'intelligence':
        return (
          <RiskIntelligence
            locations={locations ?? []}
            loading={locLoading}
            error={locError}
            selectedId={selectedId}
            onRetry={refreshLoc}
          />
        );
      case 'map':
        return (
          <GISMap
            locations={locations ?? []}
            loading={locLoading}
            error={locError}
            alerts={alerts ?? []}
            reports={reports ?? []}
            selectedId={selectedId}
            onSelectLocation={handleSelectLocation}
            onRetry={refreshLoc}
          />
        );
      case 'impact':
        return (
          <ImpactMatrix
            locations={locations ?? []}
            loading={locLoading}
            error={locError}
            selectedId={selectedId}
            onSelectLocation={handleSelectLocation}
            onRetry={refreshLoc}
          />
        );
      case 'priority':
        return (
          <PriorityEngine
            locations={locations ?? []}
            loading={locLoading}
            error={locError}
            selectedId={selectedId}
            onSelectLocation={handleSelectLocation}
            onRetry={refreshLoc}
          />
        );
      case 'community':
        return (
          <CommunitySentinel
            locations={locations ?? []}
            reports={reports ?? []}
            loading={repLoading}
            error={repError}
            selectedId={selectedId}
            onSelectLocation={handleSelectLocation}
            onSubmitReport={reportsState.insertReport}
            onUpdateStatus={reportsState.updateReportStatus}
            onRetry={refreshRep}
          />
        );
      case 'alerts':
        return (
          <AlertCenter
            alerts={alerts ?? []}
            loading={alLoading}
            error={alError}
            onResolve={alertsState.resolveAlert}
            onRetry={refreshAl}
          />
        );
      case 'analytics':
        return (
          <Analytics
            locations={locations ?? []}
            reports={reports ?? []}
            alerts={alerts ?? []}
            loading={locLoading}
            error={locError}
            onRetry={refreshLoc}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <Sidebar
        active={view}
        onNavigate={setView}
        alertCount={activeAlertCount}
        reportCount={pendingReportCount}
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <div className="lg:pl-64">
        <Header
          view={view}
          onMenuClick={() => setMobileNavOpen(true)}
          locations={locations ?? []}
          selectedId={selectedId}
          onSelectLocation={handleSelectLocation}
          demoActive={demoActive}
          demoStep={demoStep}
          onRunDemo={runDemo}
          onResetDemo={resetDemo}
        />
        <main className="px-4 py-4 lg:px-6 lg:py-6">
          {demoActive && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20">
                <span className="h-3 w-3 animate-pulse rounded-full bg-orange-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-orange-600">
                  LIVE DEMO SCENARIO IN PROGRESS — Step {demoStep}/4
                </p>
                <p className="text-xs text-slate-500">
                  Simulated escalation on highest-risk location. Demo data is marked and can be
                  removed with Reset.
                </p>
              </div>
            </div>
          )}
          {renderView()}
        </main>
      </div>
    </div>
  );
}
