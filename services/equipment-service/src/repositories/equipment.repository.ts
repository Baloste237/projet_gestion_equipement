import { prisma } from "../config/prisma";
import { CreateEquipmentDTO, UpdateEquipmentDTO } from "../Types/equipment.type";

export const equipmentRepository = {
  create: (data: CreateEquipmentDTO) => prisma.equipment.create({ data }),
  findAll: () => prisma.equipment.findMany(),
  findById: (id: string) => prisma.equipment.findUnique({ where: { id } }),
  update: (id: string, data: UpdateEquipmentDTO) =>
    prisma.equipment.update({ where: { id }, data }),
  delete: (id: string) => prisma.equipment.delete({ where: { id } }),
};
