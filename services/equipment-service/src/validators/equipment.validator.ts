import { z } from "zod";

export const equipmentStatusEnum = z.enum([
  "AVAILABLE",
  "ASSIGNED",
  "IN_MAINTENANCE",
  "RETIRED",
]);

export const createEquipmentSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  serialNumber: z.string().min(3, "Le numéro de série doit contenir au moins 3 caractères"),
  categoryId: z.string().uuid("L'ID de catégorie doit être un UUID valide"),
  supplierId: z.string().uuid("L'ID de fournisseur doit être un UUID valide").optional().nullable(),
  status: equipmentStatusEnum.optional().default("AVAILABLE"),
});

export const updateEquipmentSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").optional(),
  serialNumber: z.string().min(3, "Le numéro de série doit contenir au moins 3 caractères").optional(),
  categoryId: z.string().uuid("L'ID de catégorie doit être un UUID valide").optional(),
  supplierId: z.string().uuid("L'ID de fournisseur doit être un UUID valide").optional().nullable(),
  status: equipmentStatusEnum.optional(),
});

export const transferEquipmentSchema = z.object({
  toUserId: z.string().uuid("L'ID d'utilisateur doit être un UUID valide").optional(),
  toDepartmentId: z.string().uuid("L'ID de département doit être un UUID valide").optional(),
  reason: z.string().optional(),
});
