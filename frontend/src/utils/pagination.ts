// Logique pure de la pagination (taille de page, bornage, plage affichée, numéros de page) : testable sans navigateur.

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_STORAGE_KEY = 'equipcore.pageSize';

type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'setItem'>;

export const isPageSize = (value: unknown): value is (typeof PAGE_SIZES)[number] =>
  typeof value === 'number' && (PAGE_SIZES as readonly number[]).includes(value);

const browserStorage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Accès au stockage refusé (navigation privée, données bloquées)
    return null;
  }
};

// Taille mémorisée pour l'utilisateur ; toute valeur absente, corrompue ou non proposée donne la taille par défaut
export const readStoredPageSize = (storage: StorageReader | null = browserStorage()): number => {
  try {
    const stored = Number(storage?.getItem(PAGE_SIZE_STORAGE_KEY));
    return isPageSize(stored) ? stored : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
};

export const storePageSize = (size: number, storage: StorageWriter | null = browserStorage()): void => {
  if (!isPageSize(size)) return;
  try {
    storage?.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
  } catch {
    // Le stockage est un confort : son échec ne doit rien casser
  }
};

export const totalPages = (total: number, pageSize: number): number =>
  total > 0 && pageSize > 0 ? Math.ceil(total / pageSize) : 0;

// Ramène une page dans les limites (au moins la page 1, au plus la dernière)
export const clampPage = (page: number, total: number, pageSize: number): number => {
  const last = Math.max(1, totalPages(total, pageSize));
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(1, Math.trunc(page)), last);
};

/** Plage affichée, numérotée à partir de 1 : « 26 à 50 sur 612 » (`from` et `to` valent 0 pour une liste vide). */
export const pageRange = (page: number, pageSize: number, total: number): { from: number; to: number } => {
  if (total <= 0) return { from: 0, to: 0 };
  const current = clampPage(page, total, pageSize);
  return { from: (current - 1) * pageSize + 1, to: Math.min(current * pageSize, total) };
};

export const rangeLabel = (page: number, pageSize: number, total: number): string => {
  const { from, to } = pageRange(page, pageSize, total);
  return total <= 0 ? '0 résultat' : `${from} à ${to} sur ${total}`;
};

// Découpe une liste déjà chargée (listes paginées dans le navigateur)
export const paginate = <T>(items: readonly T[], page: number, pageSize: number): T[] => {
  const current = clampPage(page, items.length, pageSize);
  return items.slice((current - 1) * pageSize, current * pageSize);
};

export type PageToken = number | 'ellipsis-start' | 'ellipsis-end';

/**
 * Numéros de page à afficher : tous jusqu'à 7 pages, sinon la première, la dernière et les voisines de la page
 * courante, séparées par des points de suspension (au plus 7 éléments, la page courante en fait toujours partie).
 */
export const pageWindow = (page: number, pages: number): PageToken[] => {
  if (pages <= 0) return [];
  const all = Array.from({ length: pages }, (_, index) => index + 1);
  if (pages <= 7) return all;
  const current = Math.min(Math.max(1, page), pages);
  if (current <= 4) return [1, 2, 3, 4, 5, 'ellipsis-end', pages];
  if (current >= pages - 3) return [1, 'ellipsis-start', pages - 4, pages - 3, pages - 2, pages - 1, pages];
  return [1, 'ellipsis-start', current - 1, current, current + 1, 'ellipsis-end', pages];
};
