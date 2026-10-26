import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { EquipmentListQuery, NULLABLE_SORT_FIELDS } from "../validators/equipment-list.validator";
import { BatchConflict, CreateEquipmentDTO, UpdateEquipmentDTO } from "../types/equipment.type";

// Levée dans une transaction pour l'annuler quand un statut a changé entre la lecture et l'écriture
class BatchAbort extends Error {}

// Tri par défaut de la liste (aussi pour l'appel sans paramètre) : date d'ajout décroissante
const DEFAULT_LIST_QUERY: EquipmentListQuery = { pagination: null, sort: "createdAt", order: "desc" };

// Recherche (nom, numéro de série, catégorie), catégorie, statut et période sur la date de tri.
// Une période exclut d'elle-même les équipements sans date : une comparaison avec une valeur nulle est fausse.
export const buildEquipmentWhere = (query: EquipmentListQuery): Prisma.EquipmentWhereInput => {
  const where: Prisma.EquipmentWhereInput = {};
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { serialNumber: { contains: query.q, mode: "insensitive" } },
      { category: { name: { contains: query.q, mode: "insensitive" } } },
    ];
  }
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.status) where.status = query.status;
  if (query.from || query.to) {
    (where as Record<string, unknown>)[query.sort] = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
  }
  return where;
};

// Les équipements sans date en fin de liste (dans les deux sens) ; l'identifiant départage les dates égales,
// par exemple les équipements d'un même import, pour qu'aucune ligne ne saute ni ne se répète d'une page à l'autre
export const buildEquipmentOrderBy = (query: EquipmentListQuery): Prisma.EquipmentOrderByWithRelationInput[] => {
  const primary = NULLABLE_SORT_FIELDS.includes(query.sort)
    ? { [query.sort]: { sort: query.order, nulls: "last" } }
    : { [query.sort]: query.order };
  return [primary as Prisma.EquipmentOrderByWithRelationInput, { id: "asc" }];
};

export const equipmentRepository = {
  create: (data: CreateEquipmentDTO) =>
    prisma.equipment.create({
      data: data as any,
      include: { category: true, supplier: true },
    }),
  findAll: (query: EquipmentListQuery = DEFAULT_LIST_QUERY) =>
    prisma.equipment.findMany({
      where: buildEquipmentWhere(query),
      orderBy: buildEquipmentOrderBy(query),
      include: { category: true, supplier: true },
    }),
  // Une page et le nombre total d'équipements correspondant aux filtres, lus dans la même transaction
  findPage: async (query: EquipmentListQuery) => {
    const { skip, take } = query.pagination!;
    const where = buildEquipmentWhere(query);
    const [rows, total] = await prisma.$transaction([
      prisma.equipment.findMany({
        where,
        orderBy: buildEquipmentOrderBy(query),
        include: { category: true, supplier: true },
        skip,
        take,
      }),
      prisma.equipment.count({ where }),
    ]);
    return { rows, total };
  },
  findById: (id: string) =>
    prisma.equipment.findUnique({
      where: { id },
      include: { category: true, supplier: true },
    }),
  update: (id: string, data: UpdateEquipmentDTO) =>
    prisma.equipment.update({
      where: { id },
      data: data as any,
      include: { category: true, supplier: true },
    }),
  delete: (id: string) => prisma.equipment.delete({ where: { id } }),

  findManyByIds: (ids: string[]) =>
    prisma.equipment.findMany({ where: { id: { in: ids } }, include: { category: true, supplier: true } }),

  /**
   * Passe les équipements de `from` à `to`, seulement si TOUS sont actuellement au statut `from`
   * (une seule transaction : sinon rien n'est modifié et les équipements en défaut sont listés).
   */
  updateStatusIfAll: async (ids: string[], from: string, to: string) => {
    try {
      return await prisma.$transaction(async (tx: any) => {
        const before = await tx.equipment.findMany({ where: { id: { in: ids } }, include: { category: true } });
        const byId = new Map<string, any>(before.map((e: any) => [e.id, e]));
        const conflicts: BatchConflict[] = ids.flatMap((id): BatchConflict[] => {
          const current = byId.get(id);
          if (!current) return [{ id, reason: "NOT_FOUND" as const }];
          return current.status === from ? [] : [{ id, reason: "STATUS_MISMATCH" as const, status: current.status }];
        });
        if (conflicts.length) return { ok: false as const, conflicts };

        // La condition sur le statut protège contre un changement concurrent après la lecture
        const result = await tx.equipment.updateMany({ where: { id: { in: ids }, status: from }, data: { status: to } });
        if (result.count !== ids.length) throw new BatchAbort();

        const after = await tx.equipment.findMany({ where: { id: { in: ids } }, include: { category: true } });
        return { ok: true as const, before, after };
      });
    } catch (err) {
      if (!(err instanceof BatchAbort)) throw err;
      // Un statut a changé pendant l'opération : on relit l'état pour renvoyer les équipements en défaut
      const current = await prisma.equipment.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } });
      const byId = new Map<string, string>(current.map((e: any) => [e.id, e.status]));
      const conflicts: BatchConflict[] = ids
        .filter((id) => byId.get(id) !== from)
        .map((id) =>
          byId.has(id)
            ? { id, reason: "STATUS_MISMATCH" as const, status: byId.get(id) }
            : { id, reason: "NOT_FOUND" as const }
        );
      return { ok: false as const, conflicts };
    }
  },

  count: () => prisma.equipment.count(),

  purgeAll: async () => {
    const result = await prisma.equipment.deleteMany({});
    return { count: result.count };
  },
};
