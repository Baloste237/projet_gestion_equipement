import { prisma } from "../config/prisma";

export const inventoryRepository = {
  create: (data: { title: string; createdBy: string }) =>
    prisma.inventory.create({ data }),

  findAll: () =>
    prisma.inventory.findMany({ include: { items: true } }),

  findById: (id: string) =>
    prisma.inventory.findUnique({ where: { id }, include: { items: true } }),

  countInProgress: () =>
    prisma.inventory.count({ where: { status: "IN_PROGRESS" } }),

  complete: (id: string) =>
    prisma.inventory.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    }),
};
