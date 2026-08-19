import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(2),
  contactInfo: z.string().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();
