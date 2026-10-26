import { prisma } from "../../config/prisma";
import { HttpError } from "../../errors/http-error";
import { eventPublisher, toEquipmentSnapshot } from "../../clients/event-publisher.client";
import { autoAssign } from "./equipment-import-assignment";
import { readSpreadsheet } from "./spreadsheet.reader";
import {
  buildEquipmentDrafts,
  customMappingSchema,
  EquipmentDraft,
  IMPORT_FIELDS,
  ImportField,
  makeHeaderMatcher,
  resolveColumnMapping,
  resolveNotesHeaders,
} from "./equipment-row.mapper";

const PREVIEW_ROW_COUNT = 5;

// Lecture commune à l'import et à l'aperçu : mêmes règles, mêmes messages d'erreur.
// L'en-tête est détecté (titre possible au-dessus) en tenant compte du mapping fourni.
const readImportSheet = async (
  file: { buffer: Buffer; originalname: string },
  customMapping: Record<string, ImportField> = {}
) => {
  let sheet;
  try {
    sheet = await readSpreadsheet(file.buffer, file.originalname, {
      detectHeaderRow: true,
      isKnownHeader: makeHeaderMatcher(customMapping),
    });
  } catch {
    throw new HttpError(400, "Fichier illisible : un CSV ou un classeur Excel (.xlsx) est attendu");
  }
  if (!sheet.rows.length) throw new HttpError(400, "Le fichier ne contient aucune ligne de données");
  return sheet;
};

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const parseCustomMapping = (raw: unknown): Record<string, ImportField> => {
  if (raw === undefined || raw === null || raw === "") return {};
  let json: unknown = raw;
  if (typeof raw === "string") {
    try {
      json = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "Le mapping doit être un objet JSON valide");
    }
  }
  const result = customMappingSchema.safeParse(json);
  if (!result.success) {
    throw new HttpError(400, "Mapping invalide : { \"En-tête du fichier\": \"champ\" } attendu", result.error.issues);
  }
  return result.data;
};

// Retrouve (sans tenir compte de la casse) ou crée les catégories/fournisseurs référencés par nom
const resolveIdsByName = async (
  names: string[],
  findAll: () => Promise<{ id: string; name: string }[]>,
  create: (name: string) => Promise<{ id: string; name: string }>
) => {
  const existing = new Map((await findAll()).map((r) => [r.name.toLowerCase(), r.id]));
  const ids = new Map<string, string>();
  for (const name of new Set(names)) {
    let id = existing.get(name.toLowerCase());
    if (!id) {
      id = (await create(name)).id;
      existing.set(name.toLowerCase(), id);
    }
    ids.set(name, id);
  }
  return ids;
};

const insertDrafts = (drafts: EquipmentDraft[]) =>
  prisma.$transaction(
    async (tx: Tx) => {
      const categoryIds = await resolveIdsByName(
        drafts.map((d) => d.categoryName),
        () => tx.category.findMany({ select: { id: true, name: true } }),
        (name) => tx.category.create({ data: { name } })
      );
      const supplierIds = await resolveIdsByName(
        drafts.flatMap((d) => (d.supplierName ? [d.supplierName] : [])),
        () => tx.supplier.findMany({ select: { id: true, name: true } }),
        (name) => tx.supplier.create({ data: { name } })
      );

      const equipments = await tx.equipment.createManyAndReturn({
        data: drafts.map(({ categoryName, supplierName, sourceRow, assigneeName, ...equipment }) => ({
          ...equipment,
          categoryId: categoryIds.get(categoryName)!,
          supplierId: supplierName ? supplierIds.get(supplierName)! : null,
        })),
      });
      const categoryNames = new Map([...categoryIds].map(([name, id]) => [id, name]));
      return { equipments, categoryNames };
    },
    { timeout: 60_000 }
  );

export const equipmentImportService = {
  // Ne crée rien : renvoie les en-têtes du fichier, quelques lignes et le mapping reconnu automatiquement
  // (au format { "En-tête du fichier": "champ" }, directement réutilisable comme `mapping` de l'import)
  preview: async (file: { buffer: Buffer; originalname: string }) => {
    const sheet = await readImportSheet(file);
    const detected = resolveColumnMapping(sheet.headers);
    const suggestedMapping: Record<string, ImportField> = Object.fromEntries(
      (Object.entries(detected) as [ImportField, string][]).map(([field, header]) => [header, field])
    );
    // Toutes les colonnes de notes sont proposées : l'import les réunit
    resolveNotesHeaders(sheet.headers).forEach((header) => {
      suggestedMapping[header] = "notes";
    });
    return {
      headers: sheet.headers,
      headerRow: sheet.headerRow,
      ignoredRowCount: sheet.ignoredRowCount,
      rowCount: sheet.rows.length,
      sampleRows: sheet.rows.slice(0, PREVIEW_ROW_COUNT).map(({ rowNumber, values }) => ({ row: rowNumber, values })),
      suggestedMapping,
      fields: IMPORT_FIELDS,
    };
  },

  import: async (file: { buffer: Buffer; originalname: string }, rawMapping?: unknown, authorization?: string) => {
    const customMapping = parseCustomMapping(rawMapping);
    const sheet = await readImportSheet(file, customMapping);

    const mapping = resolveColumnMapping(sheet.headers, customMapping);
    const { drafts, errors } = buildEquipmentDrafts(sheet.rows, mapping, resolveNotesHeaders(sheet.headers, customMapping));

    // Les numéros de série fournis ne doivent pas déjà exister en base
    const providedSerials = drafts.filter((d) => !d.serialNumber.startsWith("TMP-")).map((d) => d.serialNumber);
    if (providedSerials.length) {
      const duplicates = await prisma.equipment.findMany({
        where: { serialNumber: { in: providedSerials } },
        select: { serialNumber: true },
      });
      duplicates.forEach(({ serialNumber }) =>
        errors.push({ row: 0, message: `Numéro de série « ${serialNumber} » déjà enregistré` })
      );
    }

    // Tout ou rien : aucun équipement n'est créé si une ligne est invalide
    if (errors.length) throw new HttpError(400, "Import refusé : le fichier contient des erreurs", errors);

    const { equipments, categoryNames } = await insertDrafts(drafts);
    equipments.forEach((equipment) =>
      eventPublisher.publish("equipment.created", {
        equipmentId: equipment.id,
        after: toEquipmentSnapshot({ ...equipment, category: { name: categoryNames.get(equipment.categoryId)! } }),
      })
    );
    // Après la création : l'affectation ne peut jamais annuler l'import, ses échecs sont rapportés
    const { assignedIds, unassigned } = await autoAssign(drafts, equipments, authorization);
    return {
      mapping,
      headerRow: sheet.headerRow,
      ignoredRowCount: sheet.ignoredRowCount,
      rowCount: sheet.rows.length,
      createdCount: equipments.length,
      toCompleteCount: equipments.filter((e) => e.status === "A_COMPLETER").length,
      assignedCount: assignedIds.size,
      unassigned,
      equipments: equipments.map((e) => (assignedIds.has(e.id) ? { ...e, status: "ASSIGNED" } : e)),
    };
  },
};
