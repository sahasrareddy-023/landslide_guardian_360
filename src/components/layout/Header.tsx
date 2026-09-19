import { Menu, Activity, Radio, Play, RotateCcw } from 'lucide-react';
import { LocationSelector } from '@/components/layout/LocationSelector';
import type { LocationWithRisk, ViewKey } from '@/types';

interface HeaderProps {
  view: ViewKey;
  onMenuClick: () => void;
  locations: LocationWithRisk[];
  selectedId: string | null;
  onSelectLocation: (id: string) => void;
  demoActive: boolean;
  demoStep: number;
  onRunDemo: () => void;
  onResetDemo: () => void;
}

const VIEW_TITLES: Record<ViewKey, { title: string; sub: string }> = {
  command: { title: 'Command Center', sub: 'Real-time operational overview' },
  prediction: { title: 'Predictive Analytics', sub: 'ML risk prediction · XAI · automated alerts' },
  intelligence: { title: 'Risk Intelligence', sub: 'AI-powered predictive analysis' },
  map: { title: 'Live GIS Map', sub: 'Geospatial risk visualization' },
  impact: { title: 'Impact Matrix', sub: 'Population & infrastructure exposure' },
  priority: { title: 'Action Priority Engine', sub: 'Ranked operational priorities' },
  community: { title: 'Community Sentinel', sub: 'Citizen field reporting' },
  alerts: { title: 'Alert Center', sub: 'Active & resolved alerts' },
  analytics: { title: 'NER Analytics', sub: 'Regional trend analysis' },
};

export function Header({
  view,
  onMenuClick,
  locations,
  selectedId,
  onSelectLocation,
  demoActive,
  demoStep,
  onRunDemo,
  onResetDemo,
}: HeaderProps) {
  const v = VIEW_TITLES[view];
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-slate-900 lg:text-lg">{v.title}</h2>
          <p className="hidden truncate text-xs text-slate-500 sm:block">{v.sub}</p>
        </div>

        {/* Live indicator */}
        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 md:flex">
          <Radio size={14} className="text-emerald-500" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            Live Feed
          </span>
          <Activity size={14} className="text-cyan-600" />
        </div>

        {/* Location selector */}
        {locations.length > 0 && (
          <div className="hidden sm:block">
            <LocationSelector
              locations={locations}
              selectedId={selectedId}
              onSelect={onSelectLocation}
            />
          </div>
        )}

        {/* Demo controls */}
        <div className="flex items-center gap-2">
          {demoActive && (
            <div className="hidden items-center gap-2 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 md:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                Demo Step {demoStep}/4
              </span>
            </div>
          )}
          <button
            onClick={onRunDemo}
            disabled={demoActive}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Play size={14} />
            <span className="hidden sm:inline">Run Demo</span>
          </button>
          <button
            onClick={onResetDemo}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Mobile location selector */}
      {locations.length > 0 && (
        <div className="border-t border-slate-200 px-4 py-2 sm:hidden">
          <LocationSelector
            locations={locations}
            selectedId={selectedId}
            onSelect={onSelectLocation}
          />
        </div>
      )}
    </header>
  );
}
