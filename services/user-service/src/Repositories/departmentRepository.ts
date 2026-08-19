import { prisma } from "../Config/prisma";
import { CreateDepartmentDTO, UpdateDepartmentDTO } from "../Types/department.type";

export const departmentRepository = {
  create: (data: CreateDepartmentDTO) =>
    prisma.department.create({
      data,
    }),

  findAll: () =>
    prisma.department.findMany({
      include: { users: true },
    }),

  findById: (id: string) =>
    prisma.department.findUnique({
      where: { id },
      include: { users: true },
    }),

  update: (id: string, data: UpdateDepartmentDTO) =>
    prisma.department.update({
      where: { id },
      data,
    }),

  delete: (id: string) =>
    prisma.department.delete({
      where: { id },
    }),
};
