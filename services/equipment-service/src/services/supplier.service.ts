import { supplierRepository } from "../repositories/supplier.repository";
import { CreateSupplierDTO, UpdateSupplierDTO } from "../types/supplier.type";

export const supplierService = {
  create: (data: CreateSupplierDTO) => supplierRepository.create(data),
  getAll: () => supplierRepository.findAll(),
  getById: async (id: string) => {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) throw new Error("SUPPLIER_NOT_FOUND");
    return supplier;
  },
  update: (id: string, data: UpdateSupplierDTO) => supplierRepository.update(id, data),
  delete: (id: string) => supplierRepository.delete(id),
};
