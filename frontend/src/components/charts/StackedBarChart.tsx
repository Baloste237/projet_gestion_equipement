import React, { useState } from 'react';
import { ChartDetail } from './ChartCard';
import { percentOf } from '../../utils/dashboardStats';

export interface StackedSegment {
  key: string;
  label: string;
  value: number;
  /** Couleur de remplissage (hex) */
  color: string;
  /** Si défini, le segment et sa ligne de légende deviennent cliquables */
  onSelect?: () => void;
  /** Complément du détail (ex. « Cliquez pour ouvrir la liste ») */
  hint?: string;
}

interface StackedBarChartProps {
  segments: StackedSegment[];
  unit: (count: number) => string;
  ariaLabel: string;
}

// Barre empilée horizontale : la légende chiffrée reprend chaque segment (l'information ne repose pas sur la couleur)
export const StackedBarChart: React.FC<StackedBarChartProps> = ({ segments, unit, ariaLabel }) => {
  const [active, setActive] = useState<string | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  const detailOf = (s: StackedSegment) =>
    `${s.label} : ${unit(s.value)} (${percentOf(s.value, total)} %)${s.hint ? ` — ${s.hint}` : ''}`;
  const activeSegment = segments.find((s) => s.key === active);

  const focusProps = (s: StackedSegment) => ({
    onMouseEnter: () => setActive(s.key),
    onMouseLeave: () => setActive(null),
    onFocus: () => setActive(s.key),
    onBlur: () => setActive(null),
  });

  return (
    <div>
      <div
        role="group"
        aria-label={ariaLabel}
        className="h-5 w-full bg-surface-container-lowest rounded-full overflow-hidden flex border border-outline-variant mb-5"
      >
        {segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const Tag = s.onSelect ? 'button' : 'div';
            return (
              <Tag
                key={s.key}
                {...(s.onSelect ? { type: 'button' as const, onClick: s.onSelect } : { tabIndex: 0 })}
                {...focusProps(s)}
                aria-label={detailOf(s)}
                style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
                className={`h-full min-w-[4px] border-r border-surface-container-lowest last:border-r-0 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  s.onSelect ? 'cursor-pointer hover:opacity-80' : ''
                } ${active && active !== s.key ? 'opacity-50' : ''}`}
              />
            );
          })}
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {segments.map((s) => (
          <li key={s.key}>
            <div
              {...focusProps(s)}
              className={`bg-surface-container-lowest p-3 rounded-xl border flex flex-col gap-1 ${
                active === s.key ? 'border-primary' : 'border-outline-variant'
              }`}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-on-surface-variant font-medium truncate">{s.label}</span>
              </div>
              <span className="text-lg font-bold text-on-surface font-mono">{s.value}</span>
              <span className="text-[11px] text-on-surface-variant">{percentOf(s.value, total)} % du parc</span>
            </div>
          </li>
        ))}
      </ul>

      <ChartDetail text={activeSegment ? detailOf(activeSegment) : null} />
    </div>
  );
};
