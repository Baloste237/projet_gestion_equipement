import { useState } from 'react';
import { clampPage, paginate, readStoredPageSize, storePageSize } from '../utils/pagination';

/**
 * Pagination d'une liste déjà chargée (affectations, catégories, utilisateurs, postes).
 * - `resetKey` : à chaque changement (filtre, recherche, tri), retour à la première page ;
 * - la page est toujours ramenée dans les limites quand la liste rétrécit (suppression, filtre plus strict) ;
 * - la taille de page est mémorisée et partagée entre les listes.
 * Les statistiques de chaque page continuent de porter sur la liste entière : seule la liste affichée est découpée.
 */
export const useClientPagination = <T,>(items: readonly T[], resetKey: string) => {
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState<number>(() => readStoredPageSize());
  const [lastKey, setLastKey] = useState(resetKey);

  // Ajustement d'état pendant le rendu (recommandé par React) : évite un rendu intermédiaire sur l'ancienne page
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setPageState(1);
  }

  const current = clampPage(page, items.length, pageSize);

  return {
    page: current,
    pageSize,
    total: items.length,
    pageItems: paginate(items, current, pageSize),
    setPage: setPageState,
    setPageSize: (size: number) => {
      storePageSize(size);
      setPageSizeState(size);
      setPageState(1);
    },
  };
};
