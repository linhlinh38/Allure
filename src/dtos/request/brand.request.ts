import { z } from "zod";
import { BrandStatusEnum } from "../../utils/enum";
import { Expose } from "class-transformer";

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
    description: z.string().optional(),
    email: z.string().email('Invalid email'),
    phone: z.string().optional(),
    address: z
      .string()
      .max(255, 'Address cannot exceed 255 characters')
      .optional(),
    businessTaxCode: z
      .string()
      .min(1, 'Business tax code is required')
      .max(100, 'Business tax code cannot exceed 100 characters'),
    businessRegistrationCode: z
      .string()
      .min(1, 'Business registration code is required')
      .max(100, 'Business registration code cannot exceed 100 characters'),
    establishmentDate: z
      .string()
      .max(255, 'Establishment date can not exceed 255 characters')
      .optional(),
    province: z
      .string()
      .min(1, 'Province is required')
      .max(255, 'Province must contain at most 255 character(s)'),
    district: z
      .string()
      .min(1, 'District is required')
      .max(255, 'District must contain at most 100 character(s)'),
    ward: z
      .string()
      .min(1, 'Ward is required')
      .max(100, 'Ward must contain at most 100 character(s)'),
    businessRegistrationAddress: z
      .string()
      .max(255, 'Business registration address can not exceed 255 characters')
      .optional(),
  }),
});

export const BrandUpdateSchema = z.object({
  body: BrandCreateSchema.partial(),
});

export const BrandUpdateStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(BrandStatusEnum),
    reason: z.string().min(1, "Reason is required").optional(),
    brandId: z.string().uuid("Invalid brand id"),
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

export const FilterBrandSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    reviewerId: z.string().uuid().optional(),
    statuses: z.array(z.nativeEnum(BrandStatusEnum)).optional(),
  }),
});

export class FilterBrandRequest {
  @Expose()
  name: string;
  @Expose()
  reviewerId: string;
  @Expose()
  statuses: BrandStatusEnum[];
}
