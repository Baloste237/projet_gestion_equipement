import { z } from "zod";

export const createAssignmentSchema = z.object({
  equipmentId: z.string().uuid(),
  userId: z.string().uuid(),
  notes: z.string().optional(),
});

export const createTransferSchema = z.object({
  toUserId: z.string().uuid(),
  reason: z.string().optional(),
});

export const createReturnSchema = z.object({
  condition: z.enum(["GOOD", "DAMAGED", "LOST"]),
  note: z.string().optional(),
});
