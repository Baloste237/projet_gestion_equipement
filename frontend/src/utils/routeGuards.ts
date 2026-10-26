export type AccessRejectionReason = 'UNAUTHENTICATED' | 'UNAUTHORIZED';

export interface RouteAccessResult {
  allowed: boolean;
  reason?: AccessRejectionReason;
}

/**
 * Détermine si un utilisateur a le droit d'accéder à une route protégée.
 * 
 * @param token Jeton JWT d'authentification présent ou non
 * @param userRole Rôle système de l'utilisateur ('ADMIN' | 'RESPONSABLE' | 'AUDITEUR' | 'EMPLOYE')
 * @param allowedRoles Liste des rôles autorisés (si absent ou vide, tout utilisateur authentifié est autorisé)
 */
export const checkRouteAccess = (
  token: string | null | undefined,
  userRole: string | null | undefined,
  allowedRoles?: string[]
): RouteAccessResult => {
  if (!token || token.trim() === '') {
    return { allowed: false, reason: 'UNAUTHENTICATED' };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = (userRole || 'EMPLOYE').trim().toUpperCase();
    const authorized = allowedRoles.map((r) => r.trim().toUpperCase());
    if (!authorized.includes(role)) {
      return { allowed: false, reason: 'UNAUTHORIZED' };
    }
  }

  return { allowed: true };
};
