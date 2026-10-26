import { z } from "zod";

export const CATEGORY_NAME_MAX = 100;
export const CATEGORY_DESCRIPTION_MAX = 500;

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(CATEGORY_NAME_MAX),
  description: z.string().trim().max(CATEGORY_DESCRIPTION_MAX).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
