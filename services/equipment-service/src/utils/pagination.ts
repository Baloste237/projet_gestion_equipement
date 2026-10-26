import { HttpError } from "../errors/http-error";

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Un paramètre répété (?page=1&page=2) donne un tableau : refusé plutôt que deviné
const readInteger = (query: Record<string, unknown>, name: string, min: number, max: number, fallback: number) => {
  const raw = query[name];
  if (raw === undefined || raw === "") return fallback;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
    throw new HttpError(400, `Paramètre « ${name} » invalide : entier attendu`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new HttpError(400, `Paramètre « ${name} » invalide : entre ${min} et ${max} attendu`);
  }
  return value;
};

/**
 * Lit `page` et `pageSize`. Renvoie `null` quand aucun des deux n'est fourni : l'appelant renvoie alors la liste
 * complète, au format d'avant la pagination (les services et écrans qui lisent toute la liste ne changent pas).
 */
export const readPagination = (query: Record<string, unknown>): Pagination | null => {
  const asked = (name: string) => query[name] !== undefined && query[name] !== "";
  if (!asked("page") && !asked("pageSize")) return null;
  const page = readInteger(query, "page", 1, 1_000_000, 1);
  const pageSize = readInteger(query, "pageSize", 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
};

export const buildMeta = (total: number, pagination: Pagination): PageMeta => ({
  total,
  page: pagination.page,
  pageSize: pagination.pageSize,
  totalPages: Math.ceil(total / pagination.pageSize),
});
