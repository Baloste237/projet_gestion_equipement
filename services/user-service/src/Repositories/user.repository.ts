import { prisma } from "../Config/prisma";
import { CreateUserDTO } from "../Types/user.type";

export const userRepository = {
  create: (data: CreateUserDTO) =>
    prisma.user.create({
      data,
      include: { department: true },
    }),

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
};
