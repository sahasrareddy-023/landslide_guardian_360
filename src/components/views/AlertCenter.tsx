import { useState } from 'react';
import { Siren, CheckCircle2, Clock, MapPin, AlertTriangle, X } from 'lucide-react';
import { Card, SectionHeader, StatCard } from '@/components/ui/Card';
import { RiskBadge, StatusBadge } from '@/components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/State';
import { Collapsible } from '@/components/ui/Collapsible';
import { RISK_STYLES, formatTime, formatTimeAgo } from '@/lib/risk';
import type { Alert } from '@/types';

interface AlertCenterProps {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  onResolve: (id: string) => void;
  onRetry: () => void;
}

type FilterKey = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'RESOLVED';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'CRITICAL', label: 'Critical' },
  { key: 'HIGH', label: 'High' },
  { key: 'MEDIUM', label: 'Medium' },
  { key: 'RESOLVED', label: 'Resolved' },
];

export function AlertCenter({ alerts, loading, error, onResolve, onRetry }: AlertCenterProps) {
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [selected, setSelected] = useState<Alert | null>(null);

  if (loading) return <LoadingState message="Loading alerts…" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  const active = alerts.filter((a) => a.status === 'ACTIVE');
  const resolved = alerts.filter((a) => a.status === 'RESOLVED');
  const critical = active.filter((a) => a.severity === 'CRITICAL');
  const high = active.filter((a) => a.severity === 'HIGH');
  const medium = active.filter((a) => a.severity === 'MEDIUM');

  const filtered = alerts.filter((a) => {
    if (filter === 'ALL') return a.status === 'ACTIVE';
    if (filter === 'RESOLVED') return a.status === 'RESOLVED';
    return a.status === 'ACTIVE' && a.severity === filter;
  });

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Critical"
          value={critical.length}
          icon={<Siren size={18} />}
          accent="text-red-600"
        />
        <StatCard
          label="High"
          value={high.length}
          icon={<AlertTriangle size={18} />}
          accent="text-orange-600"
        />
        <StatCard
          label="Medium"
          value={medium.length}
          icon={<AlertTriangle size={18} />}
          accent="text-yellow-600"
        />
        <StatCard
          label="Resolved"
          value={resolved.length}
          icon={<CheckCircle2 size={18} />}
          accent="text-emerald-600"
        />
      </div>

      <Card className="p-5">
        <SectionHeader
          title="Alert Center"
          subtitle={`${active.length} active · ${resolved.length} resolved`}
          icon={<Siren size={18} />}
          right={
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    filter === f.key
                      ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-600'
                      : 'border-slate-300 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            message={`No ${filter === 'ALL' ? 'active' : filter.toLowerCase()} alerts.`}
            icon={<Siren size={32} />}
          />
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((a) => {
              const lvl = a.severity as 'MEDIUM' | 'HIGH' | 'CRITICAL';
              const s = RISK_STYLES[lvl];
              return (
                <li
                  key={a.id}
                  className={`rounded-lg border p-4 ${s.bg} ${s.border}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <RiskBadge level={lvl} size="md" />
                        <StatusBadge status={a.status} />
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock size={11} />
                          {formatTimeAgo(a.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                        <MapPin size={14} className="text-cyan-600" />
                        {a.location_name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{a.reason}</p>
                      <Collapsible title="Recommended Response" defaultOpen={false}>
                        <p className="text-sm text-slate-600">{a.recommended_response}</p>
                        <p className="mt-2 text-[11px] text-slate-500">
                          Issued: {formatTime(a.created_at)}
                          {a.resolved_at && ` · Resolved: ${formatTime(a.resolved_at)}`}
                        </p>
                      </Collapsible>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        onClick={() => setSelected(a)}
                        className="rounded-lg border border-slate-400 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Details
                      </button>
                      {a.status === 'ACTIVE' && (
                        <button
                          onClick={() => onResolve(a.id)}
                          className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20"
                        >
                          <CheckCircle2 size={12} />
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelected(null)}
        >
          <Card
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto p-5"
            onClick={() => {}}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Alert Details</h3>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <RiskBadge level={selected.severity as 'MEDIUM' | 'HIGH' | 'CRITICAL'} size="md" />
                  <StatusBadge status={selected.status} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Location</p>
                  <p className="text-sm font-semibold text-slate-900">{selected.location_name}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Reason</p>
                  <p className="text-sm text-slate-600">{selected.reason}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">
                    Recommended Response
                  </p>
                  <p className="text-sm text-slate-600">{selected.recommended_response}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Issued: {formatTime(selected.created_at)}
                  </span>
                  {selected.resolved_at && (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 size={12} />
                      Resolved: {formatTime(selected.resolved_at)}
                    </span>
                  )}
                </div>
                {selected.status === 'ACTIVE' && (
                  <button
                    onClick={() => {
                      onResolve(selected.id);
                      setSelected(null);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-600 hover:bg-emerald-500/20"
                  >
                    <CheckCircle2 size={16} />
                    Mark as Resolved
                  </button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
