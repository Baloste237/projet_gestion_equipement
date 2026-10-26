import { prisma } from "../config/prisma";

export const credentialRepository = {
  create: (data: { email: string; passwordHash: string; role: string }) =>
    prisma.credential.create({ data }),

  // Insensible à la casse : les comptes anciens peuvent avoir un e-mail en casse mixte
  findByEmail: (email: string) =>
    prisma.credential.findFirst({ where: { email: { equals: email, mode: "insensitive" } } }),

  findById: (id: string) =>
    prisma.credential.findUnique({ where: { id } }),
};
