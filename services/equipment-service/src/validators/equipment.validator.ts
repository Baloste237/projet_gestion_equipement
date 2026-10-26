import { z } from "zod";

export const equipmentStatusEnum = z.enum([
  "AVAILABLE",
  "ASSIGNED",
  "IN_MAINTENANCE",
  "RETIRED",
  "A_COMPLETER",
]);

export const equipmentConditionEnum = z.enum(["FONCTIONNEL", "NON_FONCTIONNEL"]);

const optionalDate = z.coerce.date().optional().nullable();

// Champs descriptifs supplémentaires (tous optionnels)
export const equipmentDetailsSchema = {
  barcode: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  purchaseDate: optionalDate,
  purchasePrice: z.coerce.number().nonnegative().optional().nullable(),
  warrantyEndDate: optionalDate,
  notes: z.string().optional().nullable(),
  commissionedAt: optionalDate,
  decommissionedAt: optionalDate,
};

// La mise hors service ne peut pas précéder la mise en service (quand les deux dates sont fournies)
export const serviceDatesAreCoherent = (data: { commissionedAt?: Date | null; decommissionedAt?: Date | null }) =>
  !data.commissionedAt || !data.decommissionedAt || data.decommissionedAt >= data.commissionedAt;
const serviceDatesRule = {
  message: "La date de mise hors service ne peut pas précéder la date de mise en service",
  path: ["decommissionedAt"],
};

export const createEquipmentSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  serialNumber: z.string().min(3, "Le numéro de série doit contenir au moins 3 caractères"),
  categoryId: z.string().uuid("L'ID de catégorie doit être un UUID valide"),
  supplierId: z.string().uuid("L'ID de fournisseur doit être un UUID valide").optional().nullable(),
  status: equipmentStatusEnum.optional().default("AVAILABLE"),
  condition: equipmentConditionEnum.optional().default("FONCTIONNEL"),
  imageUrl: z.string().optional().nullable(),
  ...equipmentDetailsSchema,
}).refine(serviceDatesAreCoherent, serviceDatesRule);

export const updateEquipmentSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").optional(),
  serialNumber: z.string().min(3, "Le numéro de série doit contenir au moins 3 caractères").optional(),
  categoryId: z.string().uuid("L'ID de catégorie doit être un UUID valide").optional(),
  supplierId: z.string().uuid("L'ID de fournisseur doit être un UUID valide").optional().nullable(),
  status: equipmentStatusEnum.optional(),
  condition: equipmentConditionEnum.optional(),
  imageUrl: z.string().optional().nullable(),
  ...equipmentDetailsSchema,
}).refine(serviceDatesAreCoherent, serviceDatesRule);

export const transferEquipmentSchema = z.object({
  toUserId: z.string().uuid("L'ID d'utilisateur doit être un UUID valide").optional(),
  toDepartmentId: z.string().uuid("L'ID de département doit être un UUID valide").optional(),
  reason: z.string().optional(),
});

// Plafond commun aux routes groupées (aligné sur l'affectation groupée)
export const MAX_BATCH_SIZE = 200;

const batchIds = z
  .array(z.string().uuid("Chaque identifiant doit être un UUID valide"))
  .min(1, "Au moins un équipement est requis")
  .max(MAX_BATCH_SIZE, `Au plus ${MAX_BATCH_SIZE} équipements par requête`)
  .refine((ids) => new Set(ids).size === ids.length, "La liste contient des identifiants en double");

export const lookupEquipmentsSchema = z.object({ ids: batchIds });

export const batchStatusSchema = z
  .object({ ids: batchIds, from: equipmentStatusEnum, to: equipmentStatusEnum })
  .refine((data) => data.from !== data.to, { message: "Les statuts de départ et d'arrivée doivent différer" });

export const purgeSchema = z.object({
  password: z.string().min(1, "Le mot de passe administrateur est requis"),
});
