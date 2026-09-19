import { useEffect, useState } from 'react';
import { RISK_STYLES } from '@/lib/risk';
import type { RiskLevel } from '@/types';

interface RiskGaugeProps {
  score: number;
  level: RiskLevel;
  size?: number;
  showLabel?: boolean;
}

export function RiskGauge({ score, level, size = 160, showLabel = true }: RiskGaugeProps) {
  const s = RISK_STYLES[level];
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  const offset = circ - (animated / 100) * circ;

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={`${s.text} transition-all duration-1000 ease-out`}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-black ${s.text}`}>{Math.round(score)}</span>
        <span className="text-[10px] uppercase tracking-widest text-slate-400">Risk Score</span>
      </div>
      {showLabel && (
        <span
          className={`mt-1 rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${s.bg} ${s.border} ${s.text}`}
        >
          {level}
        </span>
      )}
    </div>
  );
}
