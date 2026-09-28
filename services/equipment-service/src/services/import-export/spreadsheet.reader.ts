import ExcelJS from "exceljs";
import path from "path";
import { Readable } from "stream";

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

// Excel FR exporte en « ; », les autres outils en « , »
const detectDelimiter = (buffer: Buffer) => {
  const firstLine = buffer.toString("utf8", 0, Math.min(buffer.length, 4096)).split(/\r?\n/)[0];
  return (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
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

// Lit la première feuille : la ligne 1 contient les en-têtes, les lignes vides sont ignorées
export const readSpreadsheet = async (buffer: Buffer, filename: string) => {
  const worksheet = await loadWorksheet(buffer, filename);
  const headers: string[] = [];
  const rows: { rowNumber: number; values: SheetRow }[] = [];
  if (!worksheet) return { headers, rows };

  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = String(toCellValue(cell.value) ?? "").replace(/^﻿/, "").trim();
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values: SheetRow = {};
    let hasValue = false;
    headers.forEach((header, col) => {
      if (!header) return;
      let value = toCellValue(row.getCell(col).value);
      if (typeof value === "string") value = value.trim() || null;
      if (value !== null) hasValue = true;
      values[header] = value;
    });
    if (hasValue) rows.push({ rowNumber, values });
  });

  return { headers: headers.filter(Boolean), rows };
};
