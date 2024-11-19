import { z } from "zod";

export const CategoryCreateSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    parentCategory: z.string().uuid().nullable(),
  }),
});
export const CategoryUpdateSchema = z.object({
  body: CategoryCreateSchema.partial(),
});
