import { z } from "zod";

export const ProductImageCreateSchema = z.object({
  body: z.object({
    name: z.string().max(255, 'Name cannot exceed 255 characters').optional(),
    fileUrl: z.string().max(255),
    product: z.string().optional(),
  }),
});

export const ProductImageUpdateSchema = z.object({
  body: ProductImageCreateSchema.partial(),
});
