import React, { useState } from 'react';
import { ChartDetail } from './ChartCard';
import type { TrendBucket } from '../../utils/dashboardStats';

interface TrendChartProps {
  buckets: TrendBucket[];
  createdColor?: string;
  returnedColor?: string;
  ariaLabel: string;
}

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = { top: 12, right: 8, bottom: 28, left: 28 };

// Barres groupées « créées / restituées » par jour ou par semaine, avec graduations de l'axe des valeurs
export const TrendChart: React.FC<TrendChartProps> = ({
  buckets,
  createdColor = '#3b82f6',
  returnedColor = '#10b981',
  ariaLabel,
}) => {
  const [active, setActive] = useState<number | null>(null);

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const peak = Math.max(1, ...buckets.map((b) => Math.max(b.created, b.returned)));
  // Graduation entière : 4 lignes de repère au plus
  const step = Math.max(1, Math.ceil(peak / 4));
  const axisMax = step * Math.ceil(peak / step);
  const ticks = Array.from({ length: axisMax / step + 1 }, (_, i) => i * step);
  const y = (value: number) => PADDING.top + plotHeight - (value / axisMax) * plotHeight;

  const slot = plotWidth / buckets.length;
  const barWidth = Math.max(1.5, Math.min(14, slot / 2 - 1));
  const labelEvery = Math.ceil(buckets.length / 8);

  const totalCreated = buckets.reduce((sum, b) => sum + b.created, 0);
  const totalReturned = buckets.reduce((sum, b) => sum + b.returned, 0);
  const detailOf = (b: TrendBucket) =>
    `${b.fullLabel} : ${b.created} affectation${b.created > 1 ? 's' : ''} créée${b.created > 1 ? 's' : ''}, ${b.returned} restitution${b.returned > 1 ? 's' : ''}`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-2 text-xs text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: createdColor }} />
          Affectations créées (<strong className="text-on-surface">{totalCreated}</strong>)
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: returnedColor }} />
          Restitutions (<strong className="text-on-surface">{totalReturned}</strong>)
        </span>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label={ariaLabel} className="w-full h-auto">
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="currentColor"
              className="text-outline-variant"
              strokeWidth="0.5"
              strokeDasharray={tick === 0 ? undefined : '3 3'}
            />
            <text x={PADDING.left - 4} y={y(tick) + 3} textAnchor="end" fontSize="9" className="fill-current text-on-surface-variant">
              {tick}
            </text>
          </g>
        ))}

        {buckets.map((bucket, index) => {
          const center = PADDING.left + slot * index + slot / 2;
          const isActive = active === index;
          return (
            <g
              key={`${bucket.fullLabel}-${index}`}
              tabIndex={0}
              role="img"
              aria-label={detailOf(bucket)}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              className="outline-none"
            >
              {/* Zone de survol/focus sur toute la hauteur du bucket */}
              <rect
                x={PADDING.left + slot * index}
                y={PADDING.top}
                width={slot}
                height={plotHeight}
                fill="currentColor"
                className={isActive ? 'text-primary/10' : 'text-transparent'}
              />
              <rect
                x={center - barWidth - 0.5}
                y={y(bucket.created)}
                width={barWidth}
                height={Math.max(0, y(0) - y(bucket.created))}
                rx="1.5"
                fill={createdColor}
              />
              <rect
                x={center + 0.5}
                y={y(bucket.returned)}
                width={barWidth}
                height={Math.max(0, y(0) - y(bucket.returned))}
                rx="1.5"
                fill={returnedColor}
              />
              {index % labelEvery === 0 && (
                <text x={center} y={HEIGHT - 10} textAnchor="middle" fontSize="9" className="fill-current text-on-surface-variant">
                  {bucket.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <ChartDetail text={active === null ? null : detailOf(buckets[active])} />
    </div>
  );
};
