import { departmentRepository } from "../Repositories/departmentRepository";
import { userRepository } from "../Repositories/user.repository";
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

    const updatedDepartment = await departmentRepository.update(id, data);

    if (data.isActive === false || data.status === "INACTIF") {
      await userRepository.deactivateByDepartmentId(id);
    } else if (data.isActive === true || data.status === "ACTIF") {
      await userRepository.reactivateByDepartmentId(id);
    }

    return updatedDepartment;
  },
  delete: async (id: string) => {
    const department = await departmentRepository.findById(id);
    if (!department) throw new Error("DEPARTMENT_NOT_FOUND");
    await userRepository.unassignDepartment(id);
    return departmentRepository.delete(id);
  },
};