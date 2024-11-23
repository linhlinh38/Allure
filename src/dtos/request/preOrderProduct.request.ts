import { z } from "zod";
import { ProductClassificationCreateSchema } from "./productClassification.request";
import { ProductCreateSchema } from "./product.request";

export const PreOrderProductCreateSchema = z.object({
  body: z.object({
    startTime: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        "Start time must be a valid date string"
      ),
    endTime: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        "End time must be a valid date string"
      ),
    productClassifications: z.array(
      ProductClassificationCreateSchema.shape.body
    ),
    product: z.string().uuid("Product ID must be a valid UUID").optional(),
    productData: ProductCreateSchema.shape.body.optional(),
  }),
});

export const PreOrderProductUpdateSchema = z.object({
  body: PreOrderProductCreateSchema.partial(),
});
