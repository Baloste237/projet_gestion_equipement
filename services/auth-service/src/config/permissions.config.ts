export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    "user:create", "user:read", "user:manage-role", "user:manage",
    "equipment:create", "equipment:read", "equipment:update", "equipment:delete",
    "assignment:create", "assignment:read", "assignment:transfer", "assignment:return",
    "inventory:create", "inventory:validate",
    "audit:read",
  ],
  RESPONSABLE: [
    "user:read",
    "equipment:read", "equipment:update",
    "assignment:create", "assignment:read", "assignment:transfer", "assignment:return",
    "inventory:create",
  ],
  EMPLOYE: [
    "equipment:read",
    "assignment:read",
  ],
  AUDITEUR: [
    "equipment:read",
    "assignment:read",
    "inventory:validate",
    "audit:read",
  ],
};

export function getPermissionsForRole(role: string): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
