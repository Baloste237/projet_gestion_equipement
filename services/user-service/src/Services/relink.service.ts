import { userRepository } from "../Repositories/user.repository";
import { authServiceClient } from "../clients/auth-service.client";

export interface RelinkSummary {
  linked: number; // fiche reliée (ou reliée à un autre compte) et alignée sur le compte
  aligned: number; // déjà reliée, rôle ou état remis d'aplomb
  cleared: number; // identifiant de compte sans correspondance retiré
  unchanged: number;
  conflicts: string[]; // e-mails dont le compte est déjà porté par une autre fiche
}

type Profile = Awaited<ReturnType<typeof userRepository.findAll>>[number];

/**
 * Reprise des fiches existantes : relie chaque fiche au compte de même e-mail (casse ignorée), reprend le rôle
 * et l'état du compte, et retire les identifiants qui ne correspondent à aucun compte. Aucune fiche n'est supprimée.
 * Idempotent : une seconde exécution ne modifie rien. `dryRun` n'écrit rien.
 */
export const relinkProfiles = async (options: { dryRun?: boolean } = {}): Promise<RelinkSummary> => {
  const summary: RelinkSummary = { linked: 0, aligned: 0, cleared: 0, unchanged: 0, conflicts: [] };
  const profiles: Profile[] = await userRepository.findAll();

  for (const profile of profiles) {
    const credential = await authServiceClient.findByEmail(profile.email);

    if (!credential) {
      if (profile.authUserId === null) {
        summary.unchanged++;
        continue;
      }
      if (!options.dryRun) await userRepository.update(profile.id, { authUserId: null });
      summary.cleared++;
      continue;
    }

    const wasLinked = profile.authUserId === credential.id;
    const inSync = wasLinked && profile.role === credential.role && profile.isActive === credential.isActive;
    if (inSync) {
      summary.unchanged++;
      continue;
    }

    const update: Record<string, unknown> = {
      authUserId: credential.id,
      role: credential.role,
      isActive: credential.isActive,
      status: credential.isActive ? "ACTIF" : "INACTIF",
    };
    if (profile.isActive !== credential.isActive) update.deactivatedAt = credential.isActive ? null : new Date();

    if (!options.dryRun) {
      try {
        await userRepository.update(profile.id, update);
      } catch (err: any) {
        if (err?.code === "P2002") {
          summary.conflicts.push(profile.email);
          continue;
        }
        throw err;
      }
    }
    if (wasLinked) summary.aligned++;
    else summary.linked++;
  }
  return summary;
};
