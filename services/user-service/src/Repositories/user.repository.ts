import { prisma } from "../Config/prisma";
import { CreateUserDTO } from "../Types/user.type";

export const userRepository = {
  create: (data: CreateUserDTO) => {
    const { departmentId, ...rest } = data as any;
    const cleanDepartmentId = departmentId && departmentId !== "" ? departmentId : null;
    return prisma.user.create({
      data: {
        ...rest,
        departmentId: cleanDepartmentId,
      },
      include: { department: true },
    });
  },

  findAll: () =>
    prisma.user.findMany({
      include: { department: true },
    }),

  findById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      include: { department: true },
    }),

  findByAuthUserId: (authUserId: string) =>
    prisma.user.findUnique({
      where: { authUserId },
      include: { department: true },
    }),

  update: (id: string, data: Record<string, any>) =>
    prisma.user.update({
      where: { id },
      data,
      include: { department: true },
    }),

  delete: (id: string) =>
    prisma.user.delete({
      where: { id },
    }),

  deactivateByDepartmentId: (departmentId: string) =>
    prisma.user.updateMany({
      where: { departmentId },
      data: { isActive: false, deactivatedAt: new Date() },
    }),

  reactivateByDepartmentId: (departmentId: string) =>
    prisma.user.updateMany({
      where: { departmentId },
      data: { isActive: true, deactivatedAt: null },
    }),

  unassignDepartment: (departmentId: string) =>
    prisma.user.updateMany({
      where: { departmentId },
      data: { departmentId: null },
    }),
};
