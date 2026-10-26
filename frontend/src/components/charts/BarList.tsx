import React, { useState } from 'react';
import { ChartDetail } from './ChartCard';
import { percentOf } from '../../utils/dashboardStats';

export interface BarListRow {
  key: string;
  label: string;
  value: number;
  /** Part de `value` mise en évidence (ex. équipements disponibles sur le total de la catégorie) */
  highlight?: number;
  highlightLabel?: string;
}

interface BarListProps {
  rows: BarListRow[];
  /** Total de référence des pourcentages ; par défaut la somme des lignes */
  total?: number;
  unit: (count: number) => string;
  color?: string;
  highlightColor?: string;
  ariaLabel: string;
}

// Barres horizontales classées : chaque ligne affiche libellé, valeur et pourcentage en texte
export const BarList: React.FC<BarListProps> = ({
  rows,
  total,
  unit,
  color = '#3b82f6',
  highlightColor = '#10b981',
  ariaLabel,
}) => {
  const [active, setActive] = useState<string | null>(null);
  const reference = total ?? rows.reduce((sum, row) => sum + row.value, 0);
  const max = Math.max(1, ...rows.map((row) => row.value));

  const detailOf = (row: BarListRow) => {
    const base = `${row.label} : ${unit(row.value)} (${percentOf(row.value, reference)} %)`;
    return row.highlight === undefined ? base : `${base}, dont ${row.highlight} ${row.highlightLabel ?? 'mis en évidence'}`;
  };
  const activeRow = rows.find((row) => row.key === active);

  return (
    <div>
      <ul aria-label={ariaLabel} className="space-y-2.5">
        {rows.map((row) => (
          <li key={row.key}>
            <div
              tabIndex={0}
              aria-label={detailOf(row)}
              onMouseEnter={() => setActive(row.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(row.key)}
              onBlur={() => setActive(null)}
              className={`bg-surface-container-lowest p-3 rounded-xl border space-y-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                active === row.key ? 'border-primary' : 'border-outline-variant'
              }`}
            >
              <div className="flex justify-between items-center gap-3 text-xs">
                <span className="font-bold text-on-surface truncate">{row.label}</span>
                <span className="font-mono text-on-surface-variant whitespace-nowrap">
                  <strong className="text-on-surface">{row.value}</strong> ({percentOf(row.value, reference)} %)
                </span>
              </div>
              <div className="h-2.5 w-full bg-surface-container rounded-full overflow-hidden relative" aria-hidden="true">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(row.value / max) * 100}%`, backgroundColor: color }}
                />
                {row.highlight !== undefined && (
                  <div
                    className="h-full rounded-full absolute top-0 left-0 transition-all duration-300"
                    style={{ width: `${(row.highlight / max) * 100}%`, backgroundColor: highlightColor }}
                  />
                )}
              </div>
              {row.highlight !== undefined && (
                <p className="text-[11px] text-on-surface-variant">
                  {row.highlight} {row.highlightLabel}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      <ChartDetail text={activeRow ? detailOf(activeRow) : null} />
    </div>
  );
};
