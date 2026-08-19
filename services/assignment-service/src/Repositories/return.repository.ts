import { prisma } from "../config/prisma";

export const returnRepository = {
  create: (data: { assignmentId: string; condition: string; note?: string }) =>
    prisma.return.create({ data }),

  findByAssignment: (assignmentId: string) =>
    prisma.return.findUnique({ where: { assignmentId } }),
};
