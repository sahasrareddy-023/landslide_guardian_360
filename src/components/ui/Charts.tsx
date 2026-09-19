interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  max?: number;
  height?: number;
  unit?: string;
}

export function BarChart({ data, max, height = 200, unit = '' }: BarChartProps) {
  const maxVal = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2" style={{ minHeight: height }}>
      {data.map((d) => {
        const pct = (d.value / maxVal) * 100;
        const color = d.color ?? '#06b6d4';
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-xs text-slate-500" title={d.label}>
              {d.label}
            </span>
            <div className="relative h-6 flex-1 overflow-hidden rounded bg-slate-200/60">
              <div
                className="absolute inset-y-0 left-0 rounded transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
              <span className="absolute inset-y-0 right-2 flex items-center text-xs font-bold text-slate-700">
                {d.value}
                {unit}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

export function DonutChart({ data, size = 180 }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const stroke = 20;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  let acc = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        {data.map((d) => {
          const pct = d.value / total;
          const dash = pct * circ;
          const seg = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-acc * circ}
            />
          );
          acc += pct;
          return seg;
        })}
      </svg>
      <div className="space-y-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-slate-600">{d.label}</span>
            <span className="font-bold text-slate-800">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LineChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  unit?: string;
}

export function LineChart({ data, color = '#06b6d4', height = 120, unit = '' }: LineChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const w = 100;
  const h = 100;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * w;
      const y = h - ((d.value - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height }}
      >
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {data.length > 1 && (
          <>
            <polygon
              points={`0,${h} ${points} ${w},${h}`}
              fill={`url(#grad-${color.replace('#', '')})`}
            />
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}
        {data.map((d, i) => {
          const x = (i / (data.length - 1 || 1)) * w;
          const y = h - ((d.value - min) / range) * h;
          return <circle key={i} cx={x} cy={y} r="1.5" fill={color} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
      <div className="mt-0.5 text-right text-[10px] text-slate-400">
        Peak: {max}
        {unit}
      </div>
    </div>
  );
}

interface HeatCellProps {
  value: number;
  max: number;
  label?: string;
}

export function HeatCell({ value, max, label }: HeatCellProps) {
  const pct = value / (max || 1);
  const intensity = Math.round(pct * 100);
  let bg = 'bg-slate-200';
  let text = 'text-slate-500';
  if (intensity > 75) {
    bg = 'bg-red-500/20';
    text = 'text-red-600';
  } else if (intensity > 50) {
    bg = 'bg-orange-500/20';
    text = 'text-orange-600';
  } else if (intensity > 25) {
    bg = 'bg-yellow-500/20';
    text = 'text-yellow-600';
  } else if (intensity > 0) {
    bg = 'bg-emerald-500/20';
    text = 'text-emerald-600';
  }
  return (
    <div
      className={`flex h-12 items-center justify-center rounded border border-slate-200 ${bg} ${text} text-sm font-bold`}
      title={label}
    >
      {value}
    </div>
  );
}
