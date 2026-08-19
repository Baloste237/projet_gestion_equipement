export const ERROR_CODES = {
  VALIDATION_ERROR: { statusCode: 400, message: "Les données envoyées sont invalides" },
  UNAUTHENTICATED: { statusCode: 401, message: "Authentification requise" },
  FORBIDDEN: { statusCode: 403, message: "Vous n'avez pas les permissions nécessaires" },
  INTERNAL_ERROR: { statusCode: 500, message: "Une erreur interne est survenue" },

  EMAIL_ALREADY_EXISTS: { statusCode: 409, message: "Un compte existe déjà avec cet email" },
  INVALID_CREDENTIALS: { statusCode: 401, message: "Email ou mot de passe incorrect" },
  ACCOUNT_DEACTIVATED: { statusCode: 403, message: "Ce compte est désactivé" },
  INVALID_REFRESH_TOKEN: { statusCode: 401, message: "Refresh token invalide ou révoqué" },
  REFRESH_TOKEN_EXPIRED: { statusCode: 401, message: "Refresh token expiré, veuillez vous reconnecter" },
  CREDENTIAL_NOT_FOUND: { statusCode: 404, message: "Compte introuvable" },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
