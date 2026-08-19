import { departmentRepository } from "../Repositories/departmentRepository";
import { CreateDepartmentDTO, UpdateDepartmentDTO } from "../Types/department.type";

export const departmentService = {
  create: (data: CreateDepartmentDTO) => departmentRepository.create(data),
  getAll: () => departmentRepository.findAll(),
  getById: async (id: string) => {
    const department = await departmentRepository.findById(id);
    if (!department) throw new Error("DEPARTMENT_NOT_FOUND");
    return department;
  },
  update: async (id: string, data: UpdateDepartmentDTO) => {
    const department = await departmentRepository.findById(id);
    if (!department) throw new Error("DEPARTMENT_NOT_FOUND");
    return departmentRepository.update(id, data);
  },
  delete: async (id: string) => {
    const department = await departmentRepository.findById(id);
    if (!department) throw new Error("DEPARTMENT_NOT_FOUND");
    return departmentRepository.delete(id);
  },
};