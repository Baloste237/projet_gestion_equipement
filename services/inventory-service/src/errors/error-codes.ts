export const ERROR_CODES = {
  VALIDATION_ERROR: { statusCode: 400, message: "Les données envoyées sont invalides" },
  UNAUTHENTICATED: { statusCode: 401, message: "Authentification requise" },
  FORBIDDEN: { statusCode: 403, message: "Vous n'avez pas les permissions nécessaires" },
  RECORD_NOT_FOUND: { statusCode: 404, message: "Ressource introuvable" },
  INTERNAL_ERROR: { statusCode: 500, message: "Une erreur interne est survenue" },

  INVENTORY_NOT_FOUND: { statusCode: 404, message: "Inventaire introuvable" },
  INVENTORY_ALREADY_COMPLETED: { statusCode: 409, message: "Cet inventaire est déjà finalisé" },
  INVENTORY_ITEM_ALREADY_EXISTS: { statusCode: 409, message: "Cet équipement est déjà dans l'inventaire" },
  INVENTORY_ITEM_NOT_FOUND: { statusCode: 404, message: "Élément d'inventaire introuvable" },
  EQUIPMENT_NOT_FOUND: { statusCode: 404, message: "Équipement introuvable" },
  EQUIPMENT_SERVICE_UNAVAILABLE: { statusCode: 503, message: "Service équipement indisponible" },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
