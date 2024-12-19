import { z } from "zod";
import { ClassificationTypeEnum } from "../../utils/enum";
import { ProductImageCreateSchema } from "./productImage.request";

export const ProductClassificationCreateSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    sku: z.string().optional(),
    price: z.number().int().nonnegative("Price must be non-negative"),
    quantity: z.number().int().nonnegative("Quantity must be non-negative"),
    images: z.array(ProductImageCreateSchema.shape.body).optional(),
    type: z.nativeEnum(ClassificationTypeEnum),
    product: z.string().uuid().nullable().optional(),
    originalClassification: z.string().uuid().optional(),
  }),
});
export const ProductClassificationUpdateSchema = z.object({
  body: ProductClassificationCreateSchema.partial(),
});
