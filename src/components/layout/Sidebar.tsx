import {
  LayoutDashboard,
  Brain,
  Cpu,
  Map,
  Grid3x3,
  ListOrdered,
  Users,
  Siren,
  BarChart3,
  Shield,
} from 'lucide-react';
import type { ViewKey } from '@/types';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'command', label: 'Command Center', icon: LayoutDashboard },
  { key: 'prediction', label: 'Predictive Analytics', icon: Cpu },
  { key: 'intelligence', label: 'Risk Intelligence', icon: Brain },
  { key: 'map', label: 'Live GIS Map', icon: Map },
  { key: 'impact', label: 'Impact Matrix', icon: Grid3x3 },
  { key: 'priority', label: 'Action Priority', icon: ListOrdered },
  { key: 'community', label: 'Community Sentinel', icon: Users },
  { key: 'alerts', label: 'Alert Center', icon: Siren },
  { key: 'analytics', label: 'NER Analytics', icon: BarChart3 },
];

interface SidebarProps {
  active: ViewKey;
  onNavigate: (v: ViewKey) => void;
  alertCount: number;
  reportCount: number;
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ active, onNavigate, alertCount, reportCount, mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
            <Shield className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900">LANDSLIDE</h1>
            <p className="text-[10px] font-medium uppercase tracking-widest text-cyan-600">
              Guardian 360°
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Operations
          </p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              const badge =
                item.key === 'alerts'
                  ? alertCount
                  : item.key === 'community'
                    ? reportCount
                    : 0;
              return (
                <li key={item.key}>
                  <button
                    onClick={() => {
                      onNavigate(item.key);
                      onClose();
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-600 ring-1 ring-cyan-500/30'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-cyan-600' : 'text-slate-400'} />
                    <span className="flex-1">{item.label}</span>
                    {badge > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          item.key === 'alerts'
                            ? 'bg-red-500/15 text-red-600'
                            : 'bg-blue-500/15 text-blue-600'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-[10px] text-slate-400">NER Monitoring Network · Online</span>
          </div>
        </div>
      </aside>
    </>
  );
}
