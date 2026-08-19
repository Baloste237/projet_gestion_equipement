export const ERROR_CODES = {
  // Générique (identique aux autres services)
  VALIDATION_ERROR: { statusCode: 400, message: "Les données envoyées sont invalides" },
  UNAUTHENTICATED: { statusCode: 401, message: "Authentification requise" },
  FORBIDDEN: { statusCode: 403, message: "Vous n'avez pas les permissions nécessaires" },
  RECORD_NOT_FOUND: { statusCode: 404, message: "Ressource introuvable" },
  INTERNAL_ERROR: { statusCode: 500, message: "Une erreur interne est survenue" },

  // Spécifique assignment-service
  ASSIGNMENT_NOT_FOUND: { statusCode: 404, message: "Affectation introuvable" },
  USER_NOT_FOUND: { statusCode: 404, message: "Utilisateur introuvable" },
  EQUIPMENT_NOT_FOUND: { statusCode: 404, message: "Équipement introuvable" },
  EQUIPMENT_NOT_AVAILABLE: { statusCode: 409, message: "Cet équipement n'est pas disponible" },
  USER_DEACTIVATED_CANNOT_ASSIGN: { statusCode: 409, message: "Utilisateur désactivé, affectation impossible" },
  ASSIGNMENT_ALREADY_RETURNED: { statusCode: 409, message: "Cette affectation est déjà clôturée" },
  ASSIGNMENT_NOT_ACTIVE: { statusCode: 409, message: "L'affectation n'est pas active" },
  USER_SERVICE_UNAVAILABLE: { statusCode: 503, message: "Service utilisateur indisponible" },
  EQUIPMENT_SERVICE_UNAVAILABLE: { statusCode: 503, message: "Service équipement indisponible" },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
