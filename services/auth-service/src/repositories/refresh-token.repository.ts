import { prisma } from "../config/prisma";

export const refreshTokenRepository = {
  create: (data: { token: string; credentialId: string; expiresAt: Date }) =>
    prisma.refreshToken.create({ data }),

  findByToken: (token: string) =>
    prisma.refreshToken.findUnique({ where: { token }, include: { credential: true } }),

  revoke: (token: string) =>
    prisma.refreshToken.update({ where: { token }, data: { revoked: true } }),

  revokeAllForCredential: (credentialId: string) =>
    prisma.refreshToken.updateMany({
      where: { credentialId, revoked: false },
      data: { revoked: true },
    }),
};
