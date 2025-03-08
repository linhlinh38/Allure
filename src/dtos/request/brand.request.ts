import { z } from 'zod';
import { BrandStatusEnum } from '../../utils/enum';
import { Expose } from 'class-transformer';

export const BrandCreateSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(255, 'Name cannot exceed 255 characters'),
    logo: z.string().max(255, 'Logo cannot exceed 255 characters').optional(),
    documents: z.array(
      z
        .string()
        .min(1, 'Document is required')
        .max(255, 'Document cannot exceed 255 characters')
    ),
    description: z
      .string()
      .max(255, 'Description cannot exceed 255 characters')
      .optional(),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    address: z
      .string()
      .max(255, 'Address cannot exceed 255 characters')
      .optional(),
    businessTaxCode: z.string().max(100),
    businessRegistrationCode: z.string().max(100),
    establishmentDate: z.string().max(255).optional(),
    province: z.string().max(255),
    district: z.string().max(255),
    ward: z.string().max(255),
    businessRegistrationAddress: z.string().max(255).optional(),
  }),
});

export const BrandUpdateSchema = z.object({
  body: BrandCreateSchema.partial(),
});

export const BrandUpdateStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(BrandStatusEnum),
    reason: z.string().min(1, 'Reason is required').optional(),
    brandId: z.string().uuid('Invalid brand id'),
  }),
});

export class BrandUpdateStatusRequest {
  @Expose()
  reason: string;
  @Expose()
  brandId: string;
  @Expose()
  status: BrandStatusEnum;
  @Expose()
  url: string;
}

export class BrandRequest {
  @Expose()
  name: string;

  @Expose()
  logo: string;

  @Expose()
  documents: string[];

  @Expose()
  description: string;

  @Expose()
  email: string;

  @Expose()
  phone: string;

  @Expose()
  address: string;

  @Expose()
  businessTaxCode: string;

  @Expose()
  businessRegistrationCode: string;

  @Expose()
  establishmentDate: Date;

  @Expose()
  province: string;

  @Expose()
  district: string;

  @Expose()
  ward: string;

  @Expose()
  businessRegistrationAddress: string;
}
