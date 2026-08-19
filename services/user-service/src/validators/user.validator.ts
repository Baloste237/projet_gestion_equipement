import { z } from "zod";

export const createUserSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  authUserId: z.string().uuid(),
  role: z.enum(["ADMIN", "RESPONSABLE", "EMPLOYE", "AUDITEUR"]).optional(),
  departmentId: z.string().uuid().optional(),
  avatarUrl: z.string().url().optional(),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "RESPONSABLE", "EMPLOYE", "AUDITEUR"]),
  departmentId: z.string().uuid().optional(),
});
