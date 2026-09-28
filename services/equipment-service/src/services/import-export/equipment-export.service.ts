import ExcelJS from "exceljs";
import { prisma } from "../../config/prisma";

export type ExportFormat = "csv" | "xlsx";

type ExportedEquipment = Awaited<ReturnType<typeof findEquipmentsForExport>>[number];

const findEquipmentsForExport = () =>
  prisma.equipment.findMany({
    include: { category: true, supplier: true },
    orderBy: { createdAt: "asc" },
  });

const formatDate = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

// En-têtes identiques à ceux reconnus par l'import : un export peut être ré-importé tel quel
const COLUMNS: { header: string; value: (e: ExportedEquipment) => string | number | null }[] = [
  { header: "ID", value: (e) => e.id },
  { header: "Nom", value: (e) => e.name },
  { header: "N° de série", value: (e) => e.serialNumber },
  { header: "Code bar", value: (e) => e.barcode },
  { header: "Marque", value: (e) => e.brand },
  { header: "Modèle", value: (e) => e.model },
  { header: "Emplacement", value: (e) => e.location },
  { header: "Catégorie", value: (e) => e.category?.name ?? null },
  { header: "Fournisseur", value: (e) => e.supplier?.name ?? null },
  { header: "Statut", value: (e) => e.status },
  { header: "Date achat", value: (e) => formatDate(e.purchaseDate) },
  { header: "Prix", value: (e) => (e.purchasePrice === null ? null : Number(e.purchasePrice)) },
  { header: "Fin garantie", value: (e) => formatDate(e.warrantyEndDate) },
  { header: "Notes", value: (e) => e.notes },
  { header: "Créé le", value: (e) => e.createdAt.toISOString() },
];

// Neutralise l'injection de formules à l'ouverture dans un tableur (=, +, -, @)
const escapeCsvCell = (value: string | number | null) => {
  if (value === null) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = (equipments: ExportedEquipment[]) => {
  const lines = [
    COLUMNS.map((c) => escapeCsvCell(c.header)).join(";"),
    ...equipments.map((e) => COLUMNS.map((c) => escapeCsvCell(c.value(e))).join(";")),
  ];
  // BOM UTF-8 pour qu'Excel affiche correctement les accents
  return Buffer.from("﻿" + lines.join("\r\n") + "\r\n", "utf8");
};

const toXlsx = async (equipments: ExportedEquipment[]) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Équipements");
  sheet.columns = COLUMNS.map((c) => ({ header: c.header, width: Math.max(12, c.header.length + 4) }));
  equipments.forEach((e) => sheet.addRow(COLUMNS.map((c) => c.value(e))));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

export const equipmentExportService = {
  export: async (format: ExportFormat) => {
    const equipments = await findEquipmentsForExport();
    const date = new Date().toISOString().slice(0, 10);
    if (format === "xlsx") {
      return {
        buffer: await toXlsx(equipments),
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: `equipements-${date}.xlsx`,
      };
    }
    return { buffer: toCsv(equipments), contentType: "text/csv; charset=utf-8", filename: `equipements-${date}.csv` };
  },
};
