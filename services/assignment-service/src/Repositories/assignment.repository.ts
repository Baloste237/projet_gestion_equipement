import { prisma } from "../config/prisma";
import { AssignmentFilters, CreateAssignmentDTO } from "../types/assignment.type";

export const assignmentRepository = {
  create: (data: Record<string, any>) =>
    prisma.assignment.create({ data: data as any }),

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
