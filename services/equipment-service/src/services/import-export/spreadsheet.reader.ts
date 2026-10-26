import ExcelJS from "exceljs";
import path from "path";
import { Readable } from "stream";
import { normalizeHeader } from "./equipment-row.mapper";

export type CellValue = string | number | boolean | Date | null;
export type SheetRow = Record<string, CellValue>;

// Aplatit les valeurs riches d'exceljs (formules, liens, texte enrichi)
const toCellValue = (value: unknown): CellValue => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date || typeof value !== "object") return value as CellValue;
  const v = value as Record<string, any>;
  if ("result" in v) return toCellValue(v.result);
  if ("richText" in v) return v.richText.map((part: { text: string }) => part.text).join("");
  if ("text" in v) return toCellValue(v.text);
  return String(value);
};

// Excel FR exporte en « ; », les autres outils en « , » : compté sur les premières lignes non vides,
// car un titre au-dessus de l'en-tête ne contient pas forcément de séparateur
const DELIMITER_SAMPLE_LINES = 10;
const detectDelimiter = (buffer: Buffer) => {
  const lines = buffer
    .toString("utf8", 0, Math.min(buffer.length, 8192))
    .split(/\r?\n/)
    .filter((line) => line.replace(/[;,\s]/g, ""))
    .slice(0, DELIMITER_SAMPLE_LINES);
  const count = (separator: RegExp) => lines.reduce((sum, line) => sum + (line.match(separator)?.length ?? 0), 0);
  return count(/;/g) > count(/,/g) ? ";" : ",";
};

const loadWorksheet = async (buffer: Buffer, filename: string) => {
  const workbook = new ExcelJS.Workbook();
  if (path.extname(filename).toLowerCase() === ".csv") {
    // `map` conserve les valeurs brutes : sans lui, exceljs convertit « 00123 » en 123
    return workbook.csv.read(Readable.from(buffer), {
      parserOptions: { delimiter: detectDelimiter(buffer) },
      map: (value: unknown) => value,
    } as any);
  }
  await workbook.xlsx.load(buffer as any);
  return workbook.worksheets[0];
};

export interface ReadOptions {
  /**
   * Mode « fichier d'inventaire » : l'en-tête est cherché dans les premières lignes (titre possible au-dessus),
   * `()` vaut vide, les lignes sans valeur sont comptées puis ignorées et la lecture s'arrête à « LISTE DES VALEURS… ».
   * Sans cette option, la ligne 1 est l'en-tête (comportement historique).
   */
  detectHeaderRow?: boolean;
  /** Dit si un libellé de colonne est connu (alias par défaut ou mapping personnalisé) */
  isKnownHeader?: (header: string) => boolean;
}

export const HEADER_SCAN_ROWS = 20;
const MIN_KNOWN_HEADERS = 2;
const END_MARKER = "LISTE DES VALEURS";

const headerText = (value: unknown) => String(toCellValue(value) ?? "").replace(/^﻿/, "").trim();

// Texte d'une cellule du fichier d'inventaire : `()` (ligne-modèle vide) vaut vide
const significantValue = (value: CellValue): CellValue => {
  if (typeof value !== "string") return value;
  const text = value.trim();
  return /^[()\s]*$/.test(text) ? null : text;
};

type Worksheet = NonNullable<Awaited<ReturnType<typeof loadWorksheet>>>;

// Première des premières lignes qui contient au moins deux colonnes connues, sinon la première ligne non vide
const findHeaderRow = (worksheet: Worksheet, isKnownHeader: (header: string) => boolean) => {
  let firstNonEmpty = 0;
  const last = Math.min(HEADER_SCAN_ROWS, worksheet.rowCount);
  for (let rowNumber = 1; rowNumber <= last; rowNumber++) {
    const cells: string[] = [];
    worksheet.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell) => cells.push(headerText(cell.value)));
    const texts = cells.filter(Boolean);
    if (!texts.length) continue;
    if (!firstNonEmpty) firstNonEmpty = rowNumber;
    if (texts.filter(isKnownHeader).length >= MIN_KNOWN_HEADERS) return rowNumber;
  }
  return firstNonEmpty || 1;
};

const isEndMarker = (row: ExcelJS.Row) => {
  let first = "";
  row.eachCell({ includeEmpty: false }, (cell) => {
    if (!first) first = headerText(cell.value);
  });
  return first !== "" && normalizeHeader(first).startsWith(END_MARKER);
};

// Lit la première feuille : une ligne d'en-têtes (ligne 1, ou détectée), les lignes sans valeur sont ignorées
export const readSpreadsheet = async (buffer: Buffer, filename: string, options: ReadOptions = {}) => {
  const worksheet = await loadWorksheet(buffer, filename);
  const headers: string[] = [];
  const rows: { rowNumber: number; values: SheetRow }[] = [];
  if (!worksheet) return { headers, rows, headerRow: 1, ignoredRowCount: 0 };

  const inventory = Boolean(options.detectHeaderRow);
  const headerRow = inventory ? findHeaderRow(worksheet, options.isKnownHeader ?? (() => false)) : 1;

  worksheet.getRow(headerRow).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = headerText(cell.value);
  });

  const readValues = (row: ExcelJS.Row) => {
    const values: SheetRow = {};
    let hasValue = false;
    headers.forEach((header, col) => {
      if (!header) return;
      let value = toCellValue(row.getCell(col).value);
      if (typeof value === "string") value = value.trim() || null;
      if (inventory) value = significantValue(value);
      if (value !== null) hasValue = true;
      values[header] = value;
    });
    return { values, hasValue };
  };

  let ignoredRowCount = 0;
  if (!inventory) {
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === headerRow) return;
      const { values, hasValue } = readValues(row);
      if (hasValue) rows.push({ rowNumber, values });
    });
  } else {
    for (let rowNumber = headerRow + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      if (isEndMarker(row)) break;
      const { values, hasValue } = readValues(row);
      if (hasValue) rows.push({ rowNumber, values });
      else ignoredRowCount++;
    }
  }

  return { headers: headers.filter(Boolean), rows, headerRow, ignoredRowCount };
};
