import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Alert,
  FieldReport,
  Location,
  LocationWithRisk,
  RiskPrediction,
} from '@/types';

// ──────────────────────────────────────────────────────────
// Generic async data hook with loading/error states
// ──────────────────────────────────────────────────────────
interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function useAsyncData<T>(
  fetcher: () => Promise<{ data: T | null; error: string | null }>,
  deps: unknown[] = [],
): DataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(() => {
    let active = true;
    setLoading(true);
    fetcherRef
      .current()
      .then(({ data: d, error: e }) => {
        if (!active) return;
        setData(d);
        setError(e);
      })
      .catch(() => {
        if (active) setError('Unexpected error loading data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const cancel = refresh();
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refresh };
}

// ──────────────────────────────────────────────────────────
// Locations with their latest risk prediction joined
// ──────────────────────────────────────────────────────────
export function useLocations(): DataState<LocationWithRisk[]> {
  return useAsyncData(async () => {
    const { data: locs, error } = await supabase
      .from('locations')
      .select('*')
      .order('created_at');
    if (error) return { data: null, error: error.message };

    const { data: preds, error: predError } = await supabase
      .from('risk_predictions')
      .select('*')
      .order('prediction_time', { ascending: false });

    if (predError) return { data: null, error: predError.message };

    const latestByLoc = new Map<string, RiskPrediction>();
    for (const p of preds as RiskPrediction[]) {
      if (!latestByLoc.has(p.location_id)) {
        latestByLoc.set(p.location_id, p);
      }
    }

    const joined: LocationWithRisk[] = (locs as Location[]).map((l) => ({
      ...l,
      latest_prediction: latestByLoc.get(l.id) ?? null,
    }));

    joined.sort(
      (a, b) =>
        (b.latest_prediction?.risk_score ?? 0) - (a.latest_prediction?.risk_score ?? 0),
    );

    return { data: joined, error: null };
  });
}

// ──────────────────────────────────────────────────────────
// Field reports
// ──────────────────────────────────────────────────────────
export function useFieldReports(): DataState<FieldReport[]> & {
  insertReport: (
    r: Omit<FieldReport, 'id' | 'created_at' | 'status'>,
  ) => Promise<{ error: string | null }>;
  updateReportStatus: (id: string, status: FieldReport['status']) => Promise<void>;
} {
  const state = useAsyncData(async () => {
    const { data, error } = await supabase
      .from('field_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: data as FieldReport[], error: null };
  });

  const insertReport = useCallback(
    async (r: Omit<FieldReport, 'id' | 'created_at' | 'status'>) => {
      const { error } = await supabase.from('field_reports').insert({
        location_id: r.location_id,
        location_name: r.location_name,
        description: r.description,
        reporter_name: r.reporter_name,
        reporter_contact: r.reporter_contact,
        risk_level: r.risk_level,
        image_url: r.image_url,
        status: 'SUBMITTED',
      });
      if (error) return { error: error.message };
      state.refresh();
      return { error: null };
    },
    [state],
  );

  const updateReportStatus = useCallback(
    async (id: string, status: FieldReport['status']) => {
      await supabase.from('field_reports').update({ status }).eq('id', id);
      state.refresh();
    },
    [state],
  );

  return { ...state, insertReport, updateReportStatus };
}

// ──────────────────────────────────────────────────────────
// Alerts
// ──────────────────────────────────────────────────────────
export function useAlerts(): DataState<Alert[]> & {
  resolveAlert: (id: string) => Promise<void>;
  insertAlert: (
    a: Omit<Alert, 'id' | 'created_at' | 'status' | 'resolved_at'>,
  ) => Promise<{ error: string | null }>;
} {
  const state = useAsyncData(async () => {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: data as Alert[], error: null };
  });

  const resolveAlert = useCallback(
    async (id: string) => {
      await supabase
        .from('alerts')
        .update({ status: 'RESOLVED', resolved_at: new Date().toISOString() })
        .eq('id', id);
      state.refresh();
    },
    [state],
  );

  const insertAlert = useCallback(
    async (a: Omit<Alert, 'id' | 'created_at' | 'status' | 'resolved_at'>) => {
      const { error } = await supabase.from('alerts').insert({
        location_id: a.location_id,
        location_name: a.location_name,
        severity: a.severity,
        reason: a.reason,
        recommended_response: a.recommended_response,
        status: 'ACTIVE',
      });
      if (error) return { error: error.message };
      state.refresh();
      return { error: null };
    },
    [state],
  );

  return { ...state, resolveAlert, insertAlert };
}

// ──────────────────────────────────────────────────────────
// Update a location's latest risk prediction (used by demo mode)
// ──────────────────────────────────────────────────────────
export async function upsertRiskPrediction(
  locationId: string,
  fields: {
    risk_score: number;
    risk_level: RiskPrediction['risk_level'];
    confidence: number;
    rainfall_24h: number;
    soil_moisture: number;
    slope_angle: number;
    risk_factors: string[];
    recommended_actions: string[];
    is_demo: boolean;
  },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('risk_predictions').insert({
    location_id: locationId,
    ...fields,
    prediction_time: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  return { error: null };
}

// ──────────────────────────────────────────────────────────
// Realtime subscriptions — auto-refresh on DB changes
// ──────────────────────────────────────────────────────────
export function useRealtimeRefresh(
  table: 'field_reports' | 'alerts' | 'risk_predictions',
  onEvent: () => void,
): void {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        cbRef.current();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table]);
}
