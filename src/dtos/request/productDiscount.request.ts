import { z } from "zod";
import { ProductClassificationCreateSchema } from "./productClassification.request";
import { ProductCreateSchema } from "./product.request";

export const ProductDiscountCreateSchema = z.object({
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
    discount: z.number().nonnegative("Discount must be non-negative"),
    productClassifications: z.array(
      ProductClassificationCreateSchema.shape.body
    ),
    product: z
      .string({ message: "Product ID is required" })
      .uuid("Product ID must be a valid UUID"),
    productData: ProductCreateSchema.shape.body.optional(),
  }),
});

export const ProductDiscountUpdateSchema = z.object({
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
    discount: z.number().nonnegative("Price must be non-negative").optional(),
    productClassifications: z
      .array(ProductClassificationCreateSchema.shape.body.partial())
      .optional(),
  }),
});
