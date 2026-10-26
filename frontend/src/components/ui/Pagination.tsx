import React from 'react';
import { PAGE_SIZES, pageWindow, rangeLabel, totalPages } from '../../utils/pagination';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  /** Désactive les commandes pendant un chargement */
  disabled?: boolean;
}

const baseButton =
  'min-w-9 h-9 px-2 rounded-lg border text-body-sm font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const idleButton = 'border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-high';
const currentButton = 'border-primary bg-primary/15 text-primary';

// Barre de pagination commune : précédent, suivant, numéros de page, plage affichée et taille de page.
// Masquée pour une liste vide.
export const Pagination: React.FC<PaginationProps> = ({ page, pageSize, total, onPageChange, onPageSizeChange, disabled = false }) => {
  if (total <= 0) return null;

  const pages = totalPages(total, pageSize);
  const isFirst = page <= 1;
  const isLast = page >= pages;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-outline-variant/40 text-body-sm text-on-surface-variant"
    >
      <div className="flex items-center gap-3">
        <span aria-live="polite">{rangeLabel(page, pageSize, total)}</span>
        <label className="flex items-center gap-2">
          <span className="sr-only">Éléments par page</span>
          <select
            value={pageSize}
            disabled={disabled}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="bg-surface-container-lowest border border-outline-variant rounded-lg py-1.5 px-2 text-body-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} par page
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`${baseButton} ${idleButton}`}
          disabled={disabled || isFirst}
          onClick={() => onPageChange(page - 1)}
          aria-label="Page précédente"
        >
          Précédent
        </button>
        {pageWindow(page, pages).map((token) =>
          typeof token === 'number' ? (
            <button
              key={token}
              type="button"
              className={`${baseButton} ${token === page ? currentButton : idleButton}`}
              disabled={disabled}
              aria-current={token === page ? 'page' : undefined}
              aria-label={`Page ${token}`}
              onClick={() => onPageChange(token)}
            >
              {token}
            </button>
          ) : (
            <span key={token} className="px-1 select-none" aria-hidden="true">
              …
            </span>
          )
        )}
        <button
          type="button"
          className={`${baseButton} ${idleButton}`}
          disabled={disabled || isLast}
          onClick={() => onPageChange(page + 1)}
          aria-label="Page suivante"
        >
          Suivant
        </button>
      </div>
    </nav>
  );
};
