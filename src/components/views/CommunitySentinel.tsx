import { useState, useEffect } from 'react';
import { Users, Send, MapPin, User, Phone, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, SectionHeader } from '@/components/ui/Card';
import { RiskBadge, StatusBadge } from '@/components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/State';
import { RISK_STYLES, formatTimeAgo } from '@/lib/risk';
import type { FieldReport, LocationWithRisk, RiskLevel } from '@/types';

interface CommunitySentinelProps {
  locations: LocationWithRisk[];
  reports: FieldReport[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelectLocation: (id: string) => void;
  onSubmitReport: (
    r: Omit<FieldReport, 'id' | 'created_at' | 'status'>,
  ) => Promise<{ error: string | null }>;
  onUpdateStatus: (id: string, status: FieldReport['status']) => void;
  onRetry: () => void;
}

const RISK_OPTIONS: RiskLevel[] = ['LOW', 'MODERATE', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUS_OPTIONS: FieldReport['status'][] = ['SUBMITTED', 'VERIFIED', 'RESOLVED'];

export function CommunitySentinel({
  locations,
  reports,
  loading,
  error,
  selectedId,
  onSelectLocation,
  onSubmitReport,
  onUpdateStatus,
  onRetry,
}: CommunitySentinelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    location_id: '',
    description: '',
    reporter_name: '',
    reporter_contact: '',
    risk_level: 'MEDIUM' as RiskLevel,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Auto-select location in form when a hotspot is selected
  useEffect(() => {
    if (selectedId && !formData.location_id) {
      setFormData((f) => ({ ...f, location_id: selectedId }));
    }
  }, [selectedId, formData.location_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      setSubmitError('Please enter a description of the observation.');
      return;
    }
    const loc = locations.find((l) => l.id === formData.location_id);
    const locationName = loc?.name ?? 'Unknown Location';

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    const { error: err } = await onSubmitReport({
      location_id: formData.location_id || null,
      location_name: locationName,
      description: formData.description.trim(),
      reporter_name: formData.reporter_name.trim() || null,
      reporter_contact: formData.reporter_contact.trim() || null,
      risk_level: formData.risk_level,
      image_url: null,
    });

    setSubmitting(false);
    if (err) {
      setSubmitError(err);
    } else {
      setSubmitSuccess(true);
      setFormData({
        location_id: '',
        description: '',
        reporter_name: '',
        reporter_contact: '',
        risk_level: 'MEDIUM',
      });
      setTimeout(() => {
        setSubmitSuccess(false);
        setFormOpen(false);
      }, 2000);
    }
  };

  if (loading) return <LoadingState message="Loading field reports…" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Report Form */}
        <div className="lg:col-span-1">
          <Card className="p-5">
            <SectionHeader
              title="Submit Field Report"
              subtitle="Citizen & sentinel observation"
              icon={<Users size={18} />}
            />

            {!formOpen && !submitSuccess && (
              <button
                onClick={() => setFormOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-bold text-slate-900 transition-opacity hover:opacity-90"
              >
                <Send size={16} />
                New Report
              </button>
            )}

            {submitSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600">
                <CheckCircle2 size={18} />
                Report submitted successfully!
              </div>
            )}

            {formOpen && !submitSuccess && (
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Location */}
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600"
                    />
                    <select
                      value={formData.location_id}
                      onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-cyan-500/50"
                    >
                      <option value="">Select location…</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Description
                  </label>
                  <div className="relative">
                    <MessageSquare
                      size={14}
                      className="pointer-events-none absolute left-3 top-3 text-slate-500"
                    />
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      placeholder="Describe what you observed…"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-cyan-500/50"
                      maxLength={500}
                    />
                  </div>
                </div>

                {/* Risk Level */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Risk Level
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {RISK_OPTIONS.map((lvl) => {
                      const s = RISK_STYLES[lvl];
                      const isSelected = formData.risk_level === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setFormData({ ...formData, risk_level: lvl })}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-all ${
                            isSelected
                              ? `${s.bg} ${s.border} ${s.text} ring-1 ${s.ring}`
                              : 'border-slate-300 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {lvl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reporter name */}
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Your Name (optional)
                  </label>
                  <div className="relative">
                    <User
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      value={formData.reporter_name}
                      onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                      placeholder="Name"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-cyan-500/50"
                      maxLength={100}
                    />
                  </div>
                </div>

                {/* Reporter contact */}
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Contact (optional)
                  </label>
                  <div className="relative">
                    <Phone
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      value={formData.reporter_contact}
                      onChange={(e) => setFormData({ ...formData, reporter_contact: e.target.value })}
                      placeholder="Phone or email"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-cyan-500/50"
                      maxLength={100}
                    />
                  </div>
                </div>

                {submitError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-600">
                    <AlertCircle size={14} />
                    {submitError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-slate-900 transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        Submit Report
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="rounded-lg border border-slate-400 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </Card>
        </div>

        {/* Report Feed */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <SectionHeader
              title="Field Report Feed"
              subtitle={`${reports.length} reports received`}
              icon={<MessageSquare size={18} />}
            />
            {reports.length === 0 ? (
              <EmptyState
                message="No field reports yet. Reports from citizens and sentinels will appear here."
                icon={<MessageSquare size={32} />}
              />
            ) : (
              <ul className="space-y-2.5">
                {reports.map((r) => {
                  const s = RISK_STYLES[r.risk_level];
                  return (
                    <li
                      key={r.id}
                      className={`rounded-lg border p-3.5 ${s.bg} ${s.border}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <RiskBadge level={r.risk_level} />
                            <StatusBadge status={r.status} />
                            <span className="text-[11px] text-slate-500">
                              {formatTimeAgo(r.created_at)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-700">{r.description}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin size={11} />
                              {r.location_name}
                            </span>
                            {r.reporter_name && (
                              <span className="flex items-center gap-1">
                                <User size={11} />
                                {r.reporter_name}
                              </span>
                            )}
                            {r.reporter_contact && (
                              <span className="flex items-center gap-1">
                                <Phone size={11} />
                                {r.reporter_contact}
                              </span>
                            )}
                          </div>
                        </div>
                        <select
                          value={r.status}
                          onChange={(e) =>
                            onUpdateStatus(r.id, e.target.value as FieldReport['status'])
                          }
                          className="shrink-0 rounded border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-600 outline-none focus:border-cyan-500/50"
                          aria-label="Update report status"
                        >
                          {STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
