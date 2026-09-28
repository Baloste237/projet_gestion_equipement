import { prisma } from "../Config/prisma";

export const positionRepository = {
  findAll: (departmentId?: string) =>
    prisma.position.findMany({
      where: departmentId ? { departmentId } : undefined,
      include: { department: true },
    }),

  findById: (id: string) =>
    prisma.position.findUnique({
      where: { id },
      include: { department: true },
    }),
};
