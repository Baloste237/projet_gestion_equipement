import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { credentialRepository } from "../repositories/credential.repository";
import { throwError } from "../errors/throw-error";

export type CredentialRole = "ADMIN" | "RESPONSABLE" | "EMPLOYE" | "AUDITEUR";

export interface CredentialPatch {
  role?: CredentialRole;
  isActive?: boolean;
}

// Vue minimale destinée aux services : jamais de hash de mot de passe
const toSummary = (c: { id: string; email: string; role: string; isActive: boolean }) => ({
  id: c.id,
  email: c.email,
  role: c.role,
  isActive: c.isActive,
});

const MAX_ATTEMPTS = 3;

export const credentialAdminService = {
  getByEmail: async (email: string) => {
    const credential = await credentialRepository.findByEmail(email.trim());
    if (!credential) throwError("CREDENTIAL_NOT_FOUND");
    return toSummary(credential!);
  },

  /**
   * Modifie le rôle et/ou l'état actif d'un compte. Le décompte des administrateurs et la mise à jour se font
   * dans une transaction sérialisable : deux rétrogradations simultanées ne peuvent pas supprimer le dernier admin.
   * Un désactivé perd aussi tous ses jetons de rafraîchissement. L'opération est idempotente.
   */
  update: async (id: string, patch: CredentialPatch) => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await prisma.$transaction(
          async (tx) => {
            const credential = await tx.credential.findUnique({ where: { id } });
            if (!credential) return throwError("CREDENTIAL_NOT_FOUND");

            const losesAdmin =
              credential.role === "ADMIN" &&
              credential.isActive &&
              ((patch.role !== undefined && patch.role !== "ADMIN") || patch.isActive === false);

            if (losesAdmin) {
              const others = await tx.credential.count({ where: { role: "ADMIN", isActive: true, id: { not: id } } });
              if (others === 0) return throwError("LAST_ADMIN");
            }

            const updated = await tx.credential.update({
              where: { id },
              data: {
                ...(patch.role !== undefined ? { role: patch.role } : {}),
                ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
              },
            });

            if (patch.isActive === false) {
              await tx.refreshToken.updateMany({ where: { credentialId: id, revoked: false }, data: { revoked: true } });
            }
            return toSummary(updated);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
      } catch (err: any) {
        // P2034 : conflit de sérialisation, la transaction concurrente a gagné ; on relit l'état à jour
        if (err?.code === "P2034" && attempt < MAX_ATTEMPTS) continue;
        throw err;
      }
    }
  },
};
