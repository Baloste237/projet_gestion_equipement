import { throwError } from "../errors/throw-error";
import { Pagination, readPagination } from "../utils/pagination";

export const CATEGORIES = ["AUTHENTICATION", "DATA_MUTATION", "SYSTEM_EVENT"] as const;
export type AuditCategory = (typeof CATEGORIES)[number];

export interface AuditListQuery {
  pagination: Pagination | null;
  q?: string;
  category?: AuditCategory;
  /** Jour au format AAAA-MM-JJ (journée UTC) */
  date?: string;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const text = (query: Record<string, unknown>, name: string, maxLength: number) => {
  const raw = query[name];
  if (raw === undefined || raw === "") return undefined;
  if (typeof raw !== "string") return throwError("VALIDATION_ERROR", 400, `Paramètre « ${name} » invalide`);
  const value = raw.trim();
  if (!value) return undefined;
  if (value.length > maxLength) return throwError("VALIDATION_ERROR", 400, `Paramètre « ${name} » trop long`);
  return value;
};

// Début et fin de la journée UTC d'un « AAAA-MM-JJ »
export const dayBounds = (day: string) => ({
  from: new Date(`${day}T00:00:00.000Z`),
  to: new Date(`${day}T23:59:59.999Z`),
});

/** Lit et valide les paramètres de la liste du journal (pagination et filtres). */
export const parseAuditListQuery = (query: Record<string, unknown>): AuditListQuery => {
  const pagination = readPagination(query);

  const category = text(query, "category", 30);
  if (category !== undefined && !(CATEGORIES as readonly string[]).includes(category)) {
    return throwError("VALIDATION_ERROR", 400, `Paramètre « category » invalide : ${CATEGORIES.join(", ")} attendu`);
  }

  const date = text(query, "date", 10);
  if (date !== undefined) {
    const valid = DATE_ONLY.test(date) && dayBounds(date).from.toISOString().startsWith(date);
    if (!valid) return throwError("VALIDATION_ERROR", 400, "Paramètre « date » invalide : AAAA-MM-JJ attendu");
  }

  return { pagination, q: text(query, "q", 100), category: category as AuditCategory | undefined, date };
};
