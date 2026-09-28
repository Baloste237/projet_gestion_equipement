import { randomUUID } from "crypto";
import { z } from "zod";
import { CellValue, SheetRow } from "./spreadsheet.reader";

export const IMPORT_FIELDS = [
  "name",
  "serialNumber",
  "barcode",
  "brand",
  "model",
  "location",
  "purchaseDate",
  "purchasePrice",
  "warrantyEndDate",
  "notes",
  "category",
  "supplier",
  "quantity",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

export const MAX_QUANTITY_PER_ROW = 1000;
export const MAX_ITEMS_PER_IMPORT = 5000;
export const DEFAULT_CATEGORY_NAME = "Non classé";

// « N° de série » -> « N DE SERIE » : insensible à la casse, aux accents et à la ponctuation
export const normalizeHeader = (header: string) =>
  header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

const DEFAULT_MAPPING: Record<ImportField, string[]> = {
  name: ["NOM", "DESIGNATION", "LIBELLE", "NAME"],
  serialNumber: ["NUMERO DE SERIE", "N DE SERIE", "NUM SERIE", "NO SERIE", "SERIAL NUMBER", "SERIALNUMBER", "SN"],
  barcode: ["CODE BAR", "CODE BARRE", "CODE BARRES", "CODE A BARRES", "BARCODE"],
  brand: ["MARQUE", "BRAND"],
  model: ["MODELE", "MODEL"],
  location: ["EMPLACEMENT", "LOCALISATION", "LOCATION"],
  purchaseDate: ["DATE ACHAT", "DATE D ACHAT", "PURCHASE DATE", "PURCHASEDATE"],
  purchasePrice: ["PRIX", "PRIX ACHAT", "PRIX D ACHAT", "PURCHASE PRICE", "PURCHASEPRICE"],
  warrantyEndDate: ["FIN GARANTIE", "FIN DE GARANTIE", "DATE FIN GARANTIE", "WARRANTY END DATE", "WARRANTYENDDATE"],
  notes: ["NOTES", "NOTE", "REMARQUES", "COMMENTAIRE", "COMMENTAIRES", "OBSERVATIONS"],
  category: ["CATEGORIE", "CATEGORY"],
  supplier: ["FOURNISSEUR", "SUPPLIER"],
  quantity: ["QUANTITE", "QTE", "QUANTITY"],
};

export const customMappingSchema = z.record(z.string(), z.enum(IMPORT_FIELDS));

// Associe chaque en-tête du fichier à un champ : le mapping fourni prime sur le mapping par défaut
export const resolveColumnMapping = (headers: string[], customMapping: Record<string, ImportField> = {}) => {
  const lookup = new Map<string, ImportField>();
  for (const [field, aliases] of Object.entries(DEFAULT_MAPPING) as [ImportField, string[]][]) {
    aliases.forEach((alias) => lookup.set(alias, field));
  }
  for (const [header, field] of Object.entries(customMapping)) {
    lookup.set(normalizeHeader(header), field);
  }

  const mapping: Partial<Record<ImportField, string>> = {};
  for (const header of headers) {
    const field = lookup.get(normalizeHeader(header));
    if (field && !mapping[field]) mapping[field] = header;
  }
  return mapping;
};

export interface EquipmentDraft {
  name: string;
  serialNumber: string;
  status: "AVAILABLE" | "A_COMPLETER";
  barcode: string | null;
  brand: string | null;
  model: string | null;
  location: string | null;
  purchaseDate: Date | null;
  purchasePrice: number | null;
  warrantyEndDate: Date | null;
  notes: string | null;
  categoryName: string;
  supplierName: string | null;
}

export interface RowError {
  row: number;
  message: string;
}

const asText = (value: CellValue | undefined) => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim() || null;
};

const EXCEL_EPOCH_OFFSET_DAYS = 25569; // 1970-01-01 en numéro de série Excel

const asDate = (value: CellValue | undefined): Date | null | undefined => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date((value - EXCEL_EPOCH_OFFSET_DAYS) * 86400000);
  const text = String(value).trim();
  const fr = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  const date = fr ? new Date(Date.UTC(+fr[3], +fr[2] - 1, +fr[1])) : new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const asNumber = (value: CellValue | undefined): number | null | undefined => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const number = Number(String(value).replace(/[\s €]/g, "").replace(",", "."));
  return Number.isFinite(number) ? number : undefined;
};

/**
 * Transforme les lignes du fichier en équipements unitaires.
 * Une ligne de quantité N produit N équipements ; s'il manque le numéro de série
 * (ou la catégorie), un numéro temporaire TMP-<uuid> est généré et le statut passe à A_COMPLETER.
 */
export const buildEquipmentDrafts = (
  rows: { rowNumber: number; values: SheetRow }[],
  mapping: Partial<Record<ImportField, string>>
) => {
  const drafts: EquipmentDraft[] = [];
  const errors: RowError[] = [];
  const seenSerials = new Map<string, number>();

  for (const { rowNumber, values } of rows) {
    const get = (field: ImportField) => (mapping[field] ? values[mapping[field]!] : null);
    const rowErrors: string[] = [];

    const quantityValue = asNumber(get("quantity"));
    const quantity = quantityValue ?? 1;
    if (quantityValue === undefined || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_ROW) {
      rowErrors.push(`Quantité invalide (entier entre 1 et ${MAX_QUANTITY_PER_ROW} attendu)`);
    }

    const brand = asText(get("brand"));
    const model = asText(get("model"));
    const name = asText(get("name")) ?? ([brand, model].filter(Boolean).join(" ") || null);
    if (!name) rowErrors.push("Nom manquant (colonne nom, ou marque/modèle)");

    const purchaseDate = asDate(get("purchaseDate"));
    if (purchaseDate === undefined) rowErrors.push("Date d'achat invalide");
    const warrantyEndDate = asDate(get("warrantyEndDate"));
    if (warrantyEndDate === undefined) rowErrors.push("Date de fin de garantie invalide");
    const purchasePrice = asNumber(get("purchasePrice"));
    if (purchasePrice === undefined || (purchasePrice !== null && purchasePrice < 0)) rowErrors.push("Prix invalide");

    // Un numéro de série est propre à une unité : il est ignoré si la ligne en décrit plusieurs
    const serialNumber = quantity === 1 ? asText(get("serialNumber")) : null;
    if (serialNumber) {
      const firstRow = seenSerials.get(serialNumber);
      if (firstRow) rowErrors.push(`Numéro de série « ${serialNumber} » déjà présent ligne ${firstRow}`);
      else seenSerials.set(serialNumber, rowNumber);
    }

    if (rowErrors.length) {
      errors.push(...rowErrors.map((message) => ({ row: rowNumber, message })));
      continue;
    }

    const categoryName = asText(get("category"));
    const isComplete = Boolean(serialNumber && categoryName);
    for (let i = 0; i < quantity; i++) {
      drafts.push({
        name: name!,
        serialNumber: serialNumber ?? `TMP-${randomUUID()}`,
        status: isComplete ? "AVAILABLE" : "A_COMPLETER",
        barcode: asText(get("barcode")),
        brand,
        model,
        location: asText(get("location")),
        purchaseDate: purchaseDate ?? null,
        purchasePrice: purchasePrice ?? null,
        warrantyEndDate: warrantyEndDate ?? null,
        notes: asText(get("notes")),
        categoryName: categoryName ?? DEFAULT_CATEGORY_NAME,
        supplierName: asText(get("supplier")),
      });
    }
  }

  if (drafts.length > MAX_ITEMS_PER_IMPORT) {
    errors.push({ row: 0, message: `Import limité à ${MAX_ITEMS_PER_IMPORT} équipements (${drafts.length} demandés)` });
  }

  return { drafts, errors };
};
