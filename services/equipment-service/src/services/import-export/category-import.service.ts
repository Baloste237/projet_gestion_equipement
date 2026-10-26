import { HttpError } from "../../errors/http-error";
import { categoryRepository } from "../../repositories/category.repository";
import { CATEGORY_DESCRIPTION_MAX, CATEGORY_NAME_MAX } from "../../validators/category.validator";
import { normalizeHeader, RowError } from "./equipment-row.mapper";
import { CellValue, readSpreadsheet } from "./spreadsheet.reader";

export const MAX_CATEGORIES_PER_IMPORT = 1000;
const CATEGORY_NAME_MIN = 2;

// En-têtes reconnus (comparés avec `normalizeHeader` : sans casse, accents ni ponctuation)
export const NAME_HEADERS = ["NOM", "CATEGORIE", "CATEGORY", "NAME", "LIBELLE"];
const DESCRIPTION_HEADER = "DESCRIPTION";

export interface CategoryDraft {
  name: string;
  description: string | null;
}

const asText = (value: CellValue | undefined) => {
  if (value === null || value === undefined) return null;
  return String(value).trim() || null;
};

/**
 * Transforme les lignes du fichier en catégories à créer. Le nom est seulement nettoyé (`trim`), comme dans
 * l'import des équipements, pour que les deux comparent les mêmes noms. Deux lignes dont les noms ne diffèrent
 * que par la casse sont fusionnées : la première l'emporte, l'autre est comptée dans `duplicateInFileCount`.
 */
export const buildCategoryDrafts = (
  headers: string[],
  rows: { rowNumber: number; values: Record<string, CellValue> }[]
) => {
  const nameHeader = headers.find((header) => NAME_HEADERS.includes(normalizeHeader(header)));
  const descriptionHeader = headers.find((header) => normalizeHeader(header) === DESCRIPTION_HEADER);
  const drafts: CategoryDraft[] = [];
  const errors: RowError[] = [];
  let duplicateInFileCount = 0;
  if (!nameHeader) return { nameColumnFound: false, drafts, errors, duplicateInFileCount };

  if (rows.length > MAX_CATEGORIES_PER_IMPORT) {
    errors.push({ row: 0, message: `Import limité à ${MAX_CATEGORIES_PER_IMPORT} catégories (${rows.length} lignes)` });
    return { nameColumnFound: true, drafts, errors, duplicateInFileCount };
  }

  const seen = new Set<string>();
  for (const { rowNumber, values } of rows) {
    const name = asText(values[nameHeader]);
    const description = descriptionHeader ? asText(values[descriptionHeader]) : null;
    const before = errors.length;

    if (!name) errors.push({ row: rowNumber, message: "Nom manquant" });
    else if (name.length < CATEGORY_NAME_MIN) errors.push({ row: rowNumber, message: `Nom trop court (${CATEGORY_NAME_MIN} caractères minimum)` });
    else if (name.length > CATEGORY_NAME_MAX) errors.push({ row: rowNumber, message: `Nom trop long (${CATEGORY_NAME_MAX} caractères maximum)` });
    if (description && description.length > CATEGORY_DESCRIPTION_MAX) {
      errors.push({ row: rowNumber, message: `Description trop longue (${CATEGORY_DESCRIPTION_MAX} caractères maximum)` });
    }
    if (errors.length > before) continue;

    const key = name!.toLowerCase();
    if (seen.has(key)) {
      duplicateInFileCount++;
      continue;
    }
    seen.add(key);
    drafts.push({ name: name!, description });
  }

  return { nameColumnFound: true, drafts, errors, duplicateInFileCount };
};

export const categoryImportService = {
  import: async (file: { buffer: Buffer; originalname: string }) => {
    let sheet;
    try {
      sheet = await readSpreadsheet(file.buffer, file.originalname);
    } catch {
      throw new HttpError(400, "Fichier illisible : un CSV ou un classeur Excel (.xlsx) est attendu");
    }
    if (!sheet.rows.length) throw new HttpError(400, "Le fichier ne contient aucune ligne de données");

    const { nameColumnFound, drafts, errors, duplicateInFileCount } = buildCategoryDrafts(sheet.headers, sheet.rows);
    if (!nameColumnFound) {
      throw new HttpError(400, `Colonne du nom introuvable : l'en-tête doit être ${NAME_HEADERS.join(", ")}`);
    }
    // Tout ou rien : aucune catégorie n'est créée si une ligne est invalide
    if (errors.length) throw new HttpError(400, "Import refusé : le fichier contient des erreurs", errors);

    // Les catégories qui existent déjà (casse ignorée) ne sont ni modifiées ni supprimées
    const existing = new Map((await categoryRepository.findAllNames()).map((c) => [c.name.toLowerCase(), c.name]));
    const existingNames = drafts.flatMap((d) => existing.get(d.name.toLowerCase()) ?? []);
    const toCreate = drafts.filter((d) => !existing.has(d.name.toLowerCase()));
    const { count } = toCreate.length ? await categoryRepository.createMany(toCreate) : { count: 0 };

    return {
      rowCount: sheet.rows.length,
      createdCount: count,
      existingCount: existingNames.length,
      duplicateInFileCount,
      existingNames,
    };
  },
};
