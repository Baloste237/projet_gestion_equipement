import { prisma } from "../config/prisma";

export const credentialRepository = {
  create: (data: { email: string; passwordHash: string; role: string }) =>
    prisma.credential.create({ data }),

  findByEmail: (email: string) =>
    prisma.credential.findUnique({ where: { email } }),

  findById: (id: string) =>
    prisma.credential.findUnique({ where: { id } }),
};
