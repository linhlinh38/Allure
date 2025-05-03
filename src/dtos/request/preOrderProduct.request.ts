import { z } from "zod";
import { ProductClassificationCreateSchema } from "./productClassification.request";
import { ProductCreateSchema } from "./product.request";

export const PreOrderProductCreateSchema = z.object({
  body: z.object({
    startTime: z
      .string({ message: "Start time is required" })
      .refine(
        (value) => !isNaN(Date.parse(value)),
        "Start time must be a valid date string"
      ),
    endTime: z
      .string({ message: "End time is required" })
      .refine(
        (value) => !isNaN(Date.parse(value)),
        "End time must be a valid date string"
      ),
    productClassifications: z.array(
      ProductClassificationCreateSchema.shape.body
    ),
    product: z
      .string({ message: "Product ID is required" })
      .uuid("Invalid product ID"),
    productData: ProductCreateSchema.shape.body.optional(),
  }),
});

export const PreOrderProductUpdateSchema = z.object({
  body: z.object({
    startTime: z
      .string({ message: "Start time is required" })
      .refine(
        (value) => !isNaN(Date.parse(value)),
        "Start time must be a valid date string"
      )
      .optional(),
    endTime: z
      .string({ message: "End time is required" })
      .refine(
        (value) => !isNaN(Date.parse(value)),
        "End time must be a valid date string"
      )
      .optional(),
    productClassifications: z
      .array(ProductClassificationCreateSchema.shape.body.partial())
      .optional(),
  }),
});
