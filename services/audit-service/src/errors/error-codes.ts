export const ERROR_CODES = {
  VALIDATION_ERROR: { statusCode: 400, message: "Les données envoyées sont invalides" },
  UNAUTHENTICATED: { statusCode: 401, message: "Authentification requise" },
  FORBIDDEN: { statusCode: 403, message: "Vous n'avez pas les permissions nécessaires" },
  NOT_FOUND: { statusCode: 404, message: "Ressource introuvable" },
  INTERNAL_ERROR: { statusCode: 500, message: "Une erreur interne est survenue" },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
