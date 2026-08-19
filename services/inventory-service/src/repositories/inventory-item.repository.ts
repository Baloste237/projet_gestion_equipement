import { prisma } from "../config/prisma";

export const inventoryItemRepository = {
  create: (data: { inventoryId: string; equipmentId: string }) =>
    prisma.inventoryItem.create({ data }),

  findByInventory: (inventoryId: string) =>
    prisma.inventoryItem.findMany({ where: { inventoryId } }),

  findOne: (inventoryId: string, equipmentId: string) =>
    prisma.inventoryItem.findUnique({
      where: { inventoryId_equipmentId: { inventoryId, equipmentId } },
    }),

  findById: (id: string) =>
    prisma.inventoryItem.findUnique({ where: { id } }),

  markChecked: (id: string, found: boolean, note?: string) =>
    prisma.inventoryItem.update({
      where: { id },
      data: { found, note, checkedAt: new Date() },
    }),
};
