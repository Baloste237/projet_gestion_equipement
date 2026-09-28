import { prisma } from "../config/prisma";
import { CreateEquipmentDTO, UpdateEquipmentDTO } from "../types/equipment.type";

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
};
