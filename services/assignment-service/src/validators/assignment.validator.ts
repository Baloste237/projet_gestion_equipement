import { z } from "zod";
import { ASSIGNEE_TYPES, ASSIGNMENT_STATUSES } from "../types/assignment.type";

// Compatibilité : un ancien payload `{ userId }` est traduit en `{ assigneeType: "USER", assigneeId }`
const mapLegacyUserId = (body: unknown) => {
  if (body && typeof body === "object" && "userId" in body && !("assigneeId" in body)) {
    const { userId, ...rest } = body as Record<string, unknown>;
    return { ...rest, assigneeType: "USER", assigneeId: userId };
  }
  return body;
};

export const createAssignmentSchema = z.preprocess(
  mapLegacyUserId,
  z.object({
    equipmentId: z.string().uuid(),
    assigneeType: z.enum(ASSIGNEE_TYPES),
    assigneeId: z.string().uuid(),
    notes: z.string().optional(),
    expectedReturnDate: z.string().optional(),
    handoverCondition: z.string().optional(),
  })
);

export const createTransferSchema = z.object({
  toUserId: z.string().uuid(),
  reason: z.string().optional(),
});

export const createReturnSchema = z.object({
  condition: z.enum(["GOOD", "DAMAGED", "LOST"]),
  note: z.string().optional(),
});

export const assignmentFiltersSchema = z.object({
  assigneeType: z.enum(ASSIGNEE_TYPES).optional(),
  assigneeId: z.string().uuid().optional(),
  status: z.enum(ASSIGNMENT_STATUSES).optional(),
});
