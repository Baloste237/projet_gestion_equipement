import React, { useState } from 'react';
import { ChartDetail } from './ChartCard';
import { percentOf } from '../../utils/dashboardStats';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
  icon?: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  totalLabel: string;
  unit: (count: number) => string;
  ariaLabel: string;
}

const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Anneau : le total est au centre, la légende (libellé, valeur, pourcentage) double chaque part
export const DonutChart: React.FC<DonutChartProps> = ({ slices, totalLabel, unit, ariaLabel }) => {
  const [active, setActive] = useState<string | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  const detailOf = (slice: DonutSlice) => `${slice.label} : ${unit(slice.value)} (${percentOf(slice.value, total)} %)`;
  const activeSlice = slices.find((slice) => slice.key === active);
  const summary = slices.map(detailOf).join(' ; ');

  let offset = 0;
  const arcs = slices
    .filter((slice) => slice.value > 0)
    .map((slice) => {
      const length = (slice.value / total) * CIRCUMFERENCE;
      const arc = { slice, length, offset };
      offset += length;
      return arc;
    });

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <svg viewBox="0 0 160 160" role="img" aria-label={`${ariaLabel}. ${summary}`} className="w-44 h-44 shrink-0">
          <g transform="rotate(-90 80 80)">
            <circle cx="80" cy="80" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="22" className="text-surface-container-lowest" />
            {arcs.map(({ slice, length, offset: start }) => (
              <circle
                key={slice.key}
                cx="80"
                cy="80"
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={active === slice.key ? 26 : 22}
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={-start}
                onMouseEnter={() => setActive(slice.key)}
                onMouseLeave={() => setActive(null)}
                className="transition-all duration-200"
              >
                <title>{detailOf(slice)}</title>
              </circle>
            ))}
          </g>
          <text x="80" y="78" textAnchor="middle" className="fill-current text-on-surface" fontSize="26" fontWeight="700">
            {total}
          </text>
          <text x="80" y="96" textAnchor="middle" className="fill-current text-on-surface-variant" fontSize="9">
            {totalLabel}
          </text>
        </svg>

        <ul className="flex-1 w-full space-y-2">
          {slices.map((slice) => (
            <li key={slice.key}>
              <div
                tabIndex={0}
                aria-label={detailOf(slice)}
                onMouseEnter={() => setActive(slice.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(slice.key)}
                onBlur={() => setActive(null)}
                className={`bg-surface-container-lowest p-3 rounded-xl border flex items-center justify-between gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active === slice.key ? 'border-primary' : 'border-outline-variant'
                }`}
              >
                <span className="flex items-center gap-2 text-xs font-medium text-on-surface">
                  <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                  {slice.icon && <span aria-hidden="true" className="material-symbols-outlined text-base text-on-surface-variant">{slice.icon}</span>}
                  {slice.label}
                </span>
                <span className="font-mono text-xs text-on-surface-variant whitespace-nowrap">
                  <strong className="text-on-surface">{slice.value}</strong> ({percentOf(slice.value, total)} %)
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <ChartDetail text={activeSlice ? detailOf(activeSlice) : null} />
    </div>
  );
};
