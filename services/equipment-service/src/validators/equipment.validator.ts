import { z } from "zod";

export const createEquipmentSchema = z.object({
  name: z.string().min(2),
  serialNumber: z.string().min(3),
  categoryId: z.string().uuid(),
  supplierId: z.string().uuid().optional(),
});

export const updateEquipmentSchema = createEquipmentSchema.partial();
