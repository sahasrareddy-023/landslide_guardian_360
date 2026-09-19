import { useEffect, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  CloudRain,
  Droplets,
  FileText,
  Siren,
  ListOrdered,
  Lightbulb,
  Info,
} from 'lucide-react';
import type { IntelFeedEvent } from '@/types';
import { RISK_STYLES } from '@/lib/risk';

interface IntelFeedProps {
  events: IntelFeedEvent[];
}

const ICONS: Record<IntelFeedEvent['type'], typeof Info> = {
  risk_up: TrendingUp,
  risk_down: TrendingDown,
  rainfall: CloudRain,
  soil: Droplets,
  report: FileText,
  alert: Siren,
  priority: ListOrdered,
  action: Lightbulb,
  info: Info,
};

const ICON_COLORS: Record<IntelFeedEvent['type'], string> = {
  risk_up: 'text-red-500',
  risk_down: 'text-emerald-500',
  rainfall: 'text-blue-500',
  soil: 'text-cyan-500',
  report: 'text-purple-500',
  alert: 'text-orange-500',
  priority: 'text-yellow-500',
  action: 'text-lime-500',
  info: 'text-slate-400',
};

export function IntelFeed({ events }: IntelFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(0);

  useEffect(() => {
    if (events.length > prevLen.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    prevLen.current = events.length;
  }, [events.length]);

  return (
    <div
      ref={scrollRef}
      className="h-full max-h-[460px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
          Intelligence Feed
        </h3>
        <span className="text-[10px] text-slate-400">{events.length} events</span>
      </div>
      {events.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-400">No events yet. Monitoring…</p>
      ) : (
        <ul className="space-y-1.5">
          {events.map((ev) => {
            const Icon = ICONS[ev.type] ?? Info;
            const color = ICON_COLORS[ev.type] ?? 'text-slate-400';
            const sev = ev.severity;
            const sevStyle = sev && sev !== 'INFO' ? RISK_STYLES[sev as keyof typeof RISK_STYLES] : null;
            return (
              <li
                key={ev.id}
                className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors ${
                  sevStyle ? `${sevStyle.bg} ${sevStyle.border}` : 'border-slate-200 bg-slate-50'
                }`}
              >
                <Icon size={16} className={`mt-0.5 shrink-0 ${color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-slate-700">{ev.message}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {new Date(ev.timestamp).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
