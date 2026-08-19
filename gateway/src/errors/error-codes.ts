export const ERROR_CODES = {
  UNAUTHENTICATED: { statusCode: 401, message: "Authentification requise" },
  TOKEN_EXPIRED: { statusCode: 401, message: "Le token a expiré, veuillez vous reconnecter" },
  FORBIDDEN: { statusCode: 403, message: "Vous n'avez pas les permissions nécessaires" },
  SERVICE_UNAVAILABLE: { statusCode: 503, message: "Service momentanément indisponible" },
  ROUTE_NOT_FOUND: { statusCode: 404, message: "Route introuvable" },
  TOO_MANY_REQUESTS: { statusCode: 429, message: "Trop de requêtes, réessayez plus tard" },
  INTERNAL_ERROR: { statusCode: 500, message: "Une erreur interne est survenue" },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
