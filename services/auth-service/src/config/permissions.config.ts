// ÉTAT TEMPORAIRE : tous les rôles ont les mêmes droits.
// La séparation des fonctionnalités par rôle sera réintroduite dans un change dédié :
// il suffira alors de remplacer ALL_PERMISSIONS par une liste propre à chaque rôle
// (les listes précédentes sont dans l'historique Git de ce fichier).
export const ALL_PERMISSIONS: readonly string[] = [
  "user:create", "user:read", "user:manage-role", "user:manage",
  "equipment:create", "equipment:read", "equipment:update", "equipment:delete",
  "assignment:create", "assignment:read", "assignment:transfer", "assignment:return",
  "inventory:create", "inventory:validate",
  "audit:read",
];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [...ALL_PERMISSIONS],
  RESPONSABLE: [...ALL_PERMISSIONS],
  EMPLOYE: [...ALL_PERMISSIONS],
  AUDITEUR: [...ALL_PERMISSIONS],
};

export function getPermissionsForRole(role: string): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
