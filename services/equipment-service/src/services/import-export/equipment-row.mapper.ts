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
  "condition",
  "commissionedAt",
  "decommissionedAt",
  "assigneeName",
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
  purchaseDate: ["DATE ACHAT", "DATE D ACHAT", "DATE D ACQUISITION", "DATE ACQUISITION", "PURCHASE DATE", "PURCHASEDATE"],
  purchasePrice: ["PRIX", "PRIX ACHAT", "PRIX D ACHAT", "MONTANT", "PURCHASE PRICE", "PURCHASEPRICE"],
  warrantyEndDate: ["FIN GARANTIE", "FIN DE GARANTIE", "DATE FIN GARANTIE", "WARRANTY END DATE", "WARRANTYENDDATE"],
  notes: [
    "NOTES", "NOTE", "REMARQUES", "COMMENTAIRE", "COMMENTAIRES", "OBSERVATIONS",
    "OBSERVATIONS HISTORIQUE", "HISTORIQUE", "CARACTERISTIQUES", "CARACTERISTIQUE",
  ],
  category: ["CATEGORIE", "CATEGORY"],
  supplier: ["FOURNISSEUR", "SUPPLIER"],
  quantity: ["QUANTITE", "QTE", "QUANTITY"],
  condition: ["ETAT", "ETAT DE FONCTIONNEMENT", "CONDITION"],
  commissionedAt: ["DATE DE MISE EN SERVICE", "DATE MISE EN SERVICE", "MISE EN SERVICE", "COMMISSIONED AT"],
  decommissionedAt: ["DATE DE MISE HORS SERVICE", "DATE MISE HORS SERVICE", "MISE HORS SERVICE", "DECOMMISSIONED AT"],
  // « DIPOSITION » : faute de frappe présente dans des fichiers réels
  assigneeName: [
    "MIS A LA DISPOSITION DE",
    "MIS A LA DIPOSITION DE",
    "MISE A LA DISPOSITION DE",
    "MIS A DISPOSITION DE",
    "MIS A DISPOSITION",
    "AFFECTE A",
    "ASSIGNE A",
    "BENEFICIAIRE",
  ],
};

export const customMappingSchema = z.record(z.string(), z.enum(IMPORT_FIELDS));

// Alias par défaut, puis mapping fourni (qui prime), indexés par en-tête normalisé
const buildLookup = (customMapping: Record<string, ImportField>) => {
  const lookup = new Map<string, ImportField>();
  for (const [field, aliases] of Object.entries(DEFAULT_MAPPING) as [ImportField, string[]][]) {
    aliases.forEach((alias) => lookup.set(alias, field));
  }
  for (const [header, field] of Object.entries(customMapping)) {
    lookup.set(normalizeHeader(header), field);
  }
  return lookup;
};

// Sert à repérer la ligne d'en-tête d'un fichier : le libellé correspond-il à une colonne connue ?
export const makeHeaderMatcher = (customMapping: Record<string, ImportField> = {}) => {
  const lookup = buildLookup(customMapping);
  return (header: string) => lookup.has(normalizeHeader(header));
};

// Plusieurs colonnes peuvent alimenter les notes (ex. caractéristiques et observations) : toutes, dans l'ordre du fichier
export const resolveNotesHeaders = (headers: string[], customMapping: Record<string, ImportField> = {}) => {
  const lookup = buildLookup(customMapping);
  return [...new Set(headers.filter((header) => lookup.get(normalizeHeader(header)) === "notes"))];
};

// Associe chaque en-tête du fichier à un champ : le mapping fourni prime sur le mapping par défaut
export const resolveColumnMapping = (headers: string[], customMapping: Record<string, ImportField> = {}) => {
  const lookup = buildLookup(customMapping);

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
  condition: "FONCTIONNEL" | "NON_FONCTIONNEL";
  commissionedAt: Date | null;
  decommissionedAt: Date | null;
  /** Ligne du fichier d'origine et nom du bénéficiaire lu : servent à l'affectation automatique, jamais enregistrés */
  sourceRow: number;
  assigneeName: string | null;
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

// « Non-fonctionnel », « NON FONCTIONNEL », « nonfonctionnel »... ; undefined = valeur non reconnue
const asCondition = (value: CellValue | undefined): EquipmentDraft['condition'] | null | undefined => {
  const text = asText(value);
  if (text === null) return null;
  const normalized = normalizeHeader(text).replace(/ /g, '');
  if (normalized === 'FONCTIONNEL') return 'FONCTIONNEL';
  if (normalized === 'NONFONCTIONNEL') return 'NON_FONCTIONNEL';
  return undefined;
};

// « 19.500 F » : avec une monnaie explicite (F, FCFA, XAF, CFA), « . », « , » ou une espace suivis de trois chiffres
// séparent les milliers ; sans monnaie, la lecture reste « 19.5 » = 19,5
const CURRENCY_SUFFIX = /(?:FCFA|XAF|CFA|F)\.?$/i;
const THOUSANDS_GROUPED = /^\d{1,3}(?:[.,\s]\d{3})+$/;

const asNumber = (value: CellValue | undefined): number | null | undefined => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  let text = String(value).trim();
  const currency = CURRENCY_SUFFIX.exec(text);
  if (currency) {
    text = text.slice(0, currency.index).trim();
    if (!text) return undefined;
    if (THOUSANDS_GROUPED.test(text)) text = text.replace(/[.,\s]/g, "");
  }
  const number = Number(text.replace(/[\s€]/g, "").replace(",", "."));
  return Number.isFinite(number) ? number : undefined;
};

// « (Equ-Cli-001) » -> « Equ-Cli-001 » ; « () » -> aucun code
const asBarcode = (value: CellValue | undefined) => {
  const text = asText(value);
  if (text === null) return null;
  const wrapped = text.startsWith("(") && text.endsWith(")");
  return (wrapped ? text.slice(1, -1).trim() : text) || null;
};

/**
 * Transforme les lignes du fichier en équipements unitaires.
 * Une ligne de quantité N produit N équipements ; s'il manque le numéro de série
 * (ou la catégorie), un numéro temporaire TMP-<uuid> est généré et le statut passe à A_COMPLETER.
 */
export const buildEquipmentDrafts = (
  rows: { rowNumber: number; values: SheetRow }[],
  mapping: Partial<Record<ImportField, string>>,
  // Colonnes réunies dans les notes ; par défaut, celle du mapping
  notesHeaders: string[] = mapping.notes ? [mapping.notes] : []
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
    const categoryName = asText(get("category"));
    // À défaut de nom, de marque et de modèle (mobilier, câbles...), la catégorie sert de nom
    const name = asText(get("name")) ?? ([brand, model].filter(Boolean).join(" ") || categoryName);
    if (!name) rowErrors.push("Nom manquant (colonne nom, marque/modèle ou catégorie)");

    const purchaseDate = asDate(get("purchaseDate"));
    if (purchaseDate === undefined) rowErrors.push("Date d'achat invalide");
    const warrantyEndDate = asDate(get("warrantyEndDate"));
    if (warrantyEndDate === undefined) rowErrors.push("Date de fin de garantie invalide");
    const commissionedAt = asDate(get("commissionedAt"));
    if (commissionedAt === undefined) rowErrors.push("Date de mise en service invalide");
    const decommissionedAt = asDate(get("decommissionedAt"));
    if (decommissionedAt === undefined) rowErrors.push("Date de mise hors service invalide");
    if (commissionedAt && decommissionedAt && decommissionedAt < commissionedAt) {
      rowErrors.push("La date de mise hors service ne peut pas précéder la date de mise en service");
    }
    const condition = asCondition(get("condition"));
    if (condition === undefined) rowErrors.push("État invalide (FONCTIONNEL ou NON-FONCTIONNEL attendu)");
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

    const assigneeName = asText(get("assigneeName"));
    const notes = notesHeaders.map((header) => asText(values[header])).filter(Boolean).join(" | ") || null;
    const isComplete = Boolean(serialNumber && categoryName);
    for (let i = 0; i < quantity; i++) {
      drafts.push({
        name: name!,
        serialNumber: serialNumber ?? `TMP-${randomUUID()}`,
        status: isComplete ? "AVAILABLE" : "A_COMPLETER",
        condition: condition ?? "FONCTIONNEL",
        commissionedAt: commissionedAt ?? null,
        decommissionedAt: decommissionedAt ?? null,
        sourceRow: rowNumber,
        assigneeName,
        barcode: asBarcode(get("barcode")),
        brand,
        model,
        location: asText(get("location")),
        purchaseDate: purchaseDate ?? null,
        purchasePrice: purchasePrice ?? null,
        warrantyEndDate: warrantyEndDate ?? null,
        notes,
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
