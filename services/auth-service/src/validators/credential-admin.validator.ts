import { z } from "zod";

export const updateCredentialSchema = z
  .object({
    role: z.enum(["ADMIN", "RESPONSABLE", "EMPLOYE", "AUDITEUR"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.isActive !== undefined, { message: "role ou isActive est requis" });

export const credentialIdParam = z.string().uuid();
