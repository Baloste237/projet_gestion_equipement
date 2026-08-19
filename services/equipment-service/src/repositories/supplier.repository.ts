import { prisma } from "../config/prisma";
import { CreateSupplierDTO, UpdateSupplierDTO } from "../types/supplier.type";

export const supplierRepository = {
  create: (data: CreateSupplierDTO) => prisma.supplier.create({ data }),
  findAll: () => prisma.supplier.findMany(),
  findById: (id: string) => prisma.supplier.findUnique({ where: { id } }),
  update: (id: string, data: UpdateSupplierDTO) =>
    prisma.supplier.update({ where: { id }, data }),
  delete: (id: string) => prisma.supplier.delete({ where: { id } }),
};
