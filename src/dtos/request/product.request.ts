import { z } from "zod";
import { ProductClassificationCreateSchema } from "./productClassification.request";
import { ProductImageCreateSchema } from "./productImage.request";
import { FileCreateSchema } from "./file.request";
import { ProductEnum, ProductTagEnum } from "../../utils/enum";
import { Expose } from "class-transformer";

export const ProductCreateSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    sku: z
      .string({ message: "SKU is required" })
      .min(6, "SKU must at least 6 characters")
      .max(8, "SKU must be less than 8 characters"),
    brand: z.string({ message: "Brand is required" }).uuid(),
    category: z.string({ message: "Category is required" }).uuid(),
    description: z.string().optional(),
    detail: z.string().optional(),
    productClassifications: z
      .array(ProductClassificationCreateSchema.shape.body)
      .optional(),
    images: z.array(ProductImageCreateSchema.shape.body).optional(),
    certificates: z.array(FileCreateSchema.shape.body),
  }),
});

export const RecommendProductsSchema = z.object({
  body: z.object({
    search: z.string().optional(),
    tag: z.nativeEnum(ProductTagEnum).optional(),
  }),
});

export const ProductUpdateSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").optional(),
    status: z.nativeEnum(ProductEnum).optional(),
    sku: z
      .string({ message: "SKU is required" })
      .min(6, "SKU must at least 6 characters")
      .max(8, "SKU must be less than 8 characters")
      .optional(),
    brand: z.string({ message: "Brand is required" }).uuid().optional(),
    category: z.string({ message: "Category is required" }).uuid().optional(),
    description: z.string().optional(),
    detail: z.string().optional(),
    productClassifications: z
      .array(ProductClassificationCreateSchema.shape.body.partial())
      .optional(),
    images: z.array(ProductImageCreateSchema.shape.body.partial()).optional(),
    certificates: z.array(FileCreateSchema.shape.body.partial()).optional(),
  }),
});

export const ProductUpdateStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ProductEnum),
  }),
});

export class RecommendProductsRequest {
  @Expose()
  search: string;

  @Expose()
  tag: ProductTagEnum;

  @Expose()
  minPrice?: number;

  @Expose()
  maxPrice?: number;
}
