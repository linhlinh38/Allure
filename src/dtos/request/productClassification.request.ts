import { z } from "zod";

export const ProductClassificationCreateSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    quantity: z.number().int().nonnegative("Quantity must be non-negative"),
    product: z.string().uuid().nullable().optional(),
  }),
});
export const ProductClassificationUpdateSchema = z.object({
  body: ProductClassificationCreateSchema.partial(),
});
