import { z } from "zod";
import { ClassificationTypeEnum } from "../../utils/enum";

export const ProductClassificationCreateSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    price: z.number().int().nonnegative("Price must be non-negative"),
    quantity: z.number().int().nonnegative("Quantity must be non-negative"),
    image: z.string().max(100),
    type: z.nativeEnum(ClassificationTypeEnum),
    product: z.string().uuid().nullable().optional(),
    preOrderPoduct: z.string().uuid().nullable().optional(),
  }),
});
export const ProductClassificationUpdateSchema = z.object({
  body: ProductClassificationCreateSchema.partial(),
});
