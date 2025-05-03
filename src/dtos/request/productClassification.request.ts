import { z } from "zod";
import { ClassificationTypeEnum } from "../../utils/enum";
import { ProductImageCreateSchema } from "./productImage.request";

export const ProductClassificationCreateSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    sku: z.string(),
    price: z.number().int('Price must be an integer').nonnegative("Price must be non-negative"),
    quantity: z.number().int('Quantity must be an integer').nonnegative("Quantity must be non-negative"),
    color: z.string().nullable().optional(),
    size: z.string().nullable().optional(),
    other: z.string().nullable().optional(),
    images: z.array(ProductImageCreateSchema.shape.body).optional(),
    type: z.nativeEnum(ClassificationTypeEnum),
    product: z.string().uuid('Invalid product').nullable().optional(),
    originalClassification: z.string().uuid().optional(),
  }),
});
export const ProductClassificationUpdateSchema = z.object({
  body: ProductClassificationCreateSchema.partial(),
});
