import { prisma } from "../config/prisma";

export const transferRepository = {
  create: (data: { assignmentId: string; fromUserId: string; toUserId: string; reason?: string }) =>
    prisma.transfer.create({ data }),

  findByAssignment: (assignmentId: string) =>
    prisma.transfer.findMany({ where: { assignmentId } }),
};
