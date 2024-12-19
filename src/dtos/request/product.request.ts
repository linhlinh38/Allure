import { z } from "zod";
import { ProductClassificationCreateSchema } from "./productClassification.request";
import { ProductImageCreateSchema } from "./productImage.request";

export const ProductCreateSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    sku: z.string().optional(),
    brand: z.string().uuid(),
    category: z.string().uuid().nullable().optional(),
    description: z.string().optional(),
    detail: z.string().optional(),
    productClassifications: z
      .array(ProductClassificationCreateSchema.shape.body)
      .optional(),
    images: z.array(ProductImageCreateSchema.shape.body).optional(),
  }),
});

export const ProductUpdateSchema = z.object({
  body: ProductCreateSchema.partial(),
});
