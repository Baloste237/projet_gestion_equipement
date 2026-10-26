import { userRepository } from "../Repositories/user.repository";
import { authServiceClient, CredentialPatch } from "../clients/auth-service.client";
import { auditPublisher } from "../clients/audit-publisher.client";
import { AppError } from "../errors/app-error";
import {
  CreateUserDTO,
  UpdateProfileDTO,
  UpdateRoleDTO,
} from "../Types/user.type";

type UserRecord = NonNullable<Awaited<ReturnType<typeof userRepository.findById>>>;

// Un utilisateur sans compte de connexion reste visible et modifiable ; `linked` le signale à l'interface
const present = <T extends { authUserId?: string | null }>(user: T) => ({ ...user, linked: Boolean(user.authUserId) });

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const audit = (action: string, user: { id: string }, actor: string | undefined, metadata: Record<string, unknown>) =>
  void auditPublisher.publish({
    action,
    entityType: "User",
    entityId: user.id,
    performedBy: actor || "inconnu",
    metadata,
  });

/**
 * Relie la fiche au compte de même e-mail s'il existe (liaison tardive). Retourne la fiche, reliée ou non.
 * Une panne d'auth-service lève une erreur 502 : on ne modifie rien sans connaître l'état du compte.
 */
const ensureLinked = async (user: UserRecord, actor?: string): Promise<UserRecord> => {
  if (user.authUserId) return user;
  const credential = await authServiceClient.findByEmail(user.email);
  if (!credential) return user;
  try {
    const linked = await userRepository.update(user.id, { authUserId: credential.id });
    audit("ACCOUNT_LINKED", user, actor, { authUserId: credential.id, email: user.email });
    return linked as UserRecord;
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw new AppError("ACCOUNT_ALREADY_LINKED", 409, "Ce compte est déjà relié à une autre fiche");
    }
    throw err;
  }
};

/** Applique d'abord la modification au compte (source de vérité) ; si elle échoue, la fiche n'est pas touchée. */
const syncCredential = async (user: UserRecord, patch: CredentialPatch, actor?: string) => {
  if (!user.authUserId) return;
  await authServiceClient.update(user.authUserId, patch);
  audit("ACCOUNT_SYNCED", user, actor, { authUserId: user.authUserId, ...patch });
};

export const userService = {
  create: async (data: CreateUserDTO & { isActive?: boolean }, actor?: string) => {
    // Liste blanche : aucun identifiant de compte n'est accepté du client
    const email = normalizeEmail(data.email);
    const credential = await authServiceClient.findByEmail(email);
    const isActive = credential ? credential.isActive : data.isActive !== false;

    const created = await userRepository.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email,
      authUserId: credential?.id ?? null,
      // Fiche reliée : le rôle du compte prévaut sur celui saisi
      role: credential?.role ?? data.role ?? "EMPLOYE",
      departmentId: data.departmentId,
      avatarUrl: data.avatarUrl,
      phone: data.phone,
      countryCode: data.countryCode,
      isActive,
      status: isActive ? "ACTIF" : "INACTIF",
      deactivatedAt: isActive ? null : new Date(),
    } as any);
    if (credential) audit("ACCOUNT_LINKED", created, actor, { authUserId: credential.id, email });
    return present(created);
  },

  getAll: async () => (await userRepository.findAll()).map(present),

  getById: async (id: string) => {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("USER_NOT_FOUND");
    return present(user);
  },

  getByAuthUserId: async (authUserId: string) => {
    const user = await userRepository.findByAuthUserId(authUserId);
    if (!user) throw new Error("USER_NOT_FOUND");
    return present(user);
  },

  updateProfile: async (id: string, data: UpdateProfileDTO) => {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("USER_NOT_FOUND");
    if (!user.isActive) throw new Error("USER_DEACTIVATED");
    return present(await userRepository.update(id, data));
  },

  updateRole: async (id: string, data: UpdateRoleDTO, actor?: string) => {
    const found = await userRepository.findById(id);
    if (!found) throw new Error("USER_NOT_FOUND");
    const user = await ensureLinked(found, actor);

    // L'écran envoie aussi l'état actif par cette route : il suit le même chemin que la désactivation
    const statusChange = data.isActive !== undefined && data.isActive !== user.isActive;
    await syncCredential(user, { role: data.role, ...(statusChange ? { isActive: data.isActive } : {}) }, actor);

    const update: Record<string, unknown> = { role: data.role };
    if (data.departmentId !== undefined) update.departmentId = data.departmentId;
    if (statusChange) {
      update.isActive = data.isActive;
      update.status = data.isActive ? "ACTIF" : "INACTIF";
      update.deactivatedAt = data.isActive ? null : new Date();
    }
    return present(await userRepository.update(id, update));
  },

  deactivate: async (id: string, actor?: string) => {
    const found = await userRepository.findById(id);
    if (!found) throw new Error("USER_NOT_FOUND");
    if (!found.isActive) throw new Error("USER_ALREADY_DEACTIVATED");
    const user = await ensureLinked(found, actor);
    await syncCredential(user, { isActive: false }, actor);
    return present(
      await userRepository.update(id, {
        isActive: false,
        deactivatedAt: new Date(),
      })
    );
  },

  reactivate: async (id: string, actor?: string) => {
    const found = await userRepository.findById(id);
    if (!found) throw new Error("USER_NOT_FOUND");
    const user = await ensureLinked(found, actor);
    await syncCredential(user, { isActive: true }, actor);
    return present(
      await userRepository.update(id, {
        isActive: true,
        deactivatedAt: null,
      })
    );
  },

  delete: async (id: string, actor?: string) => {
    const found = await userRepository.findById(id);
    if (!found) throw new Error("USER_NOT_FOUND");
    // Le compte est désactivé (et conservé pour la traçabilité de l'audit) avant la suppression de la fiche
    const user = await ensureLinked(found, actor);
    await syncCredential(user, { isActive: false }, actor);
    return userRepository.delete(id);
  },

  /**
   * Purge tous les utilisateurs non-ADMIN sauf le compte de l'admin connecté.
   * Révoque leurs identifiants dans auth-service avant la suppression.
   */
  purgeNonAdminUsers: async (actorAuthId: string) => {
    // Récupère les authUserIds des utilisateurs à supprimer pour les révoquer dans auth-service
    const toDelete = await userRepository.findNonAdminAuthUserIds(actorAuthId);
    // Révocation non bloquante : si auth-service est indisponible, on continue (désactivation best-effort)
    await Promise.allSettled(
      toDelete
        .filter((u) => u.authUserId)
        .map((u) => authServiceClient.update(u.authUserId!, { isActive: false }))
    );
    const result = await userRepository.purgeNonAdmin(actorAuthId);
    auditPublisher.publish({
      action: "USER_LIST_PURGED",
      entityType: "User",
      entityId: "all",
      performedBy: actorAuthId,
      metadata: { deletedCount: result.count },
    });
    return result;
  },
};
