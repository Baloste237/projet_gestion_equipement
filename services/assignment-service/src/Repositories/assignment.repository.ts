import { prisma } from "../config/prisma";
import { CreateAssignmentDTO } from "../types/assignment.type";

export const assignmentRepository = {
  create: (data: CreateAssignmentDTO & { status: string }) =>
    prisma.assignment.create({ data }),

  findAll: () =>
    prisma.assignment.findMany({ include: { transfers: true, returnInfo: true } }),

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
