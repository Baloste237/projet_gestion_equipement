import { z } from "zod";

export const createPositionSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().optional().nullable(),
  departmentId: z.string().uuid(),
  status: z.enum(["ACTIF", "INACTIF"]).optional(),
  isActive: z.boolean().optional(),
});

export const updatePositionSchema = z.object({
  name: z.string().trim().min(2).optional(),
  description: z.string().optional().nullable(),
  departmentId: z.string().uuid().optional(),
  status: z.enum(["ACTIF", "INACTIF"]).optional(),
  isActive: z.boolean().optional(),
});
