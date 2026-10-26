import { HttpError } from "../errors/http-error";
import { Pagination, readPagination } from "../utils/pagination";

export const SORT_FIELDS = ["createdAt", "purchaseDate", "commissionedAt", "updatedAt"] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";

// Seuls ces champs peuvent être absents : leurs valeurs nulles sont placées en fin de liste
export const NULLABLE_SORT_FIELDS: readonly SortField[] = ["purchaseDate", "commissionedAt"];

export interface EquipmentListQuery {
  pagination: Pagination | null;
  sort: SortField;
  order: SortOrder;
  q?: string;
  categoryId?: string;
  status?: string;
  from?: Date;
  to?: Date;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const text = (query: Record<string, unknown>, name: string, maxLength: number) => {
  const raw = query[name];
  if (raw === undefined || raw === "") return undefined;
  if (typeof raw !== "string") throw new HttpError(400, `Paramètre « ${name} » invalide`);
  const value = raw.trim();
  if (!value) return undefined;
  if (value.length > maxLength) throw new HttpError(400, `Paramètre « ${name} » trop long`);
  return value;
};

// « AAAA-MM-JJ » couvre toute la journée UTC (borne basse à 00:00:00.000, borne haute à 23:59:59.999) ; sinon date-heure ISO
const bound = (query: Record<string, unknown>, name: "from" | "to") => {
  const raw = text(query, name, 40);
  if (raw === undefined) return undefined;
  const dateOnly = DATE_ONLY.test(raw);
  // Les formats ambigus que Date accepte (« 01/10/2026 ») sont refusés : seul l'ISO l'est
  if (!dateOnly && !ISO_DATETIME.test(raw)) {
    throw new HttpError(400, `Paramètre « ${name} » invalide : AAAA-MM-JJ ou date-heure ISO attendu`);
  }
  const date = new Date(dateOnly ? `${raw}T${name === "from" ? "00:00:00.000" : "23:59:59.999"}Z` : raw);
  // Rejette aussi 2026-02-31, que Date accepterait en le décalant au mois suivant
  const valid = !Number.isNaN(date.getTime()) && (!dateOnly || date.toISOString().startsWith(raw));
  if (!valid) throw new HttpError(400, `Paramètre « ${name} » invalide : AAAA-MM-JJ ou date-heure ISO attendu`);
  return date;
};

/** Lit et valide les paramètres de la liste des équipements (pagination, tri, filtres, période). */
export const parseEquipmentListQuery = (query: Record<string, unknown>): EquipmentListQuery => {
  const pagination = readPagination(query);

  const sortRaw = text(query, "sort", 30) ?? "createdAt";
  if (!(SORT_FIELDS as readonly string[]).includes(sortRaw)) {
    throw new HttpError(400, `Paramètre « sort » invalide : ${SORT_FIELDS.join(", ")} attendu`);
  }
  const orderRaw = text(query, "order", 10) ?? "desc";
  if (orderRaw !== "asc" && orderRaw !== "desc") {
    throw new HttpError(400, "Paramètre « order » invalide : asc ou desc attendu");
  }

  const categoryId = text(query, "categoryId", 40);
  if (categoryId !== undefined && !UUID.test(categoryId)) throw new HttpError(400, "Paramètre « categoryId » invalide");

  const from = bound(query, "from");
  const to = bound(query, "to");
  if (from && to && from > to) throw new HttpError(400, "La date de début est postérieure à la date de fin");

  return {
    pagination,
    sort: sortRaw as SortField,
    order: orderRaw,
    q: text(query, "q", 100),
    categoryId,
    status: text(query, "status", 30),
    from,
    to,
  };
};
