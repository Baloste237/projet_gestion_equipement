import { prisma } from "../config/prisma";
import { AssignmentFilters, CreateAssignmentDTO } from "../types/assignment.type";

export const assignmentRepository = {
  create: (data: Record<string, any>) =>
    prisma.assignment.create({ data: data as any }),

  // Insère toutes les affectations dans une seule transaction : si l'une viole l'index d'unicité
  // (une seule affectation ACTIVE par équipement), aucune n'est conservée
  createMany: (records: Record<string, any>[]) =>
    prisma.$transaction(records.map((data) => prisma.assignment.create({ data: data as any }))),

  // Compensation : retire les affectations d'une opération dont le changement de statut a échoué
  deleteByIds: (ids: string[]) => prisma.assignment.deleteMany({ where: { id: { in: ids } } }),

  findAll: (filters: AssignmentFilters = {}) =>
    prisma.assignment.findMany({ where: filters, include: { transfers: true, returnInfo: true } }),

  findById: (id: string) =>
    prisma.assignment.findUnique({
      where: { id },
      include: { transfers: true, returnInfo: true },
    }),

  findActiveByEquipment: (equipmentId: string) =>
    prisma.assignment.findFirst({ where: { equipmentId, status: "ACTIVE" } }),

  updateStatus: (id: string, status: string) =>
    prisma.assignment.update({ where: { id }, data: { status } }),
};
