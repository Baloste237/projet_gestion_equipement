import { prisma } from "../config/prisma";
import { BatchConflict, CreateEquipmentDTO, UpdateEquipmentDTO } from "../types/equipment.type";

// Levée dans une transaction pour l'annuler quand un statut a changé entre la lecture et l'écriture
class BatchAbort extends Error {}

export const equipmentRepository = {
  create: (data: CreateEquipmentDTO) =>
    prisma.equipment.create({
      data: data as any,
      include: { category: true, supplier: true },
    }),
  findAll: () =>
    prisma.equipment.findMany({
      include: { category: true, supplier: true },
    }),
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
};
