import { z } from "zod";

export const createInventorySchema = z.object({
  title: z.string().min(3),
});

export const addInventoryItemSchema = z.object({
  equipmentId: z.string().uuid(),
});

export const checkInventoryItemSchema = z.object({
  found: z.boolean(),
  note: z.string().optional(),
});
