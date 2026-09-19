import { MapPin } from 'lucide-react';
import type { LocationWithRisk } from '@/types';
import { RISK_STYLES } from '@/lib/risk';

interface LocationSelectorProps {
  locations: LocationWithRisk[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function LocationSelector({ locations, selectedId, onSelect }: LocationSelectorProps) {
  return (
    <div className="relative">
      <MapPin
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600"
      />
      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full min-w-[200px] max-w-[260px] truncate rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-700 outline-none focus:border-cyan-400/50 lg:w-auto"
        aria-label="Select monitored location"
      >
        {locations.map((loc) => {
          const level = loc.latest_prediction?.risk_level ?? 'LOW';
          const s = RISK_STYLES[level];
          return (
            <option key={loc.id} value={loc.id}>
              {loc.name} — Risk {loc.latest_prediction?.risk_score ?? 'N/A'} ({level})
            </option>
          );
        })}
      </select>
    </div>
  );
}
