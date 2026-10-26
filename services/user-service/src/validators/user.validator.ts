import { z } from "zod";

export const createUserSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["ADMIN", "RESPONSABLE", "EMPLOYE", "AUDITEUR"]).optional(),
  departmentId: z.string().uuid().optional(),
  avatarUrl: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  avatarUrl: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
});

export const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "RESPONSABLE", "EMPLOYE", "AUDITEUR"]),
  departmentId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  status: z.enum(["ACTIF", "INACTIF"]).optional(),
});
