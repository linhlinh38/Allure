import { z } from 'zod';
import { ProductClassificationCreateSchema } from './productClassification.request';
import { ProductImageCreateSchema } from './productImage.request';
import { FileCreateSchema } from './file.request';
import { ProductTagEnum } from '../../utils/enum';
import { Expose } from 'class-transformer';

export const ProductCreateSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    sku: z.string(),
    brand: z.string().uuid(),
    category: z.string().uuid().nullable().optional(),
    description: z.string().optional(),
    detail: z.string().optional(),
    productClassifications: z
      .array(ProductClassificationCreateSchema.shape.body)
      .optional(),
    images: z.array(ProductImageCreateSchema.shape.body).optional(),
    certificates: z.array(FileCreateSchema.shape.body).optional(),
  }),
});

export const RecommendProductsSchema = z.object({
  body: z.object({
    search: z.string().optional(),
    tag: z.nativeEnum(ProductTagEnum).optional(),
  }),
});

export const ProductUpdateSchema = z.object({
  body: ProductCreateSchema.partial(),
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
