import { z } from 'zod';
import { VoucherCreateSchema, VoucherRequest } from './voucher.request';
import { Expose } from 'class-transformer';

export const GroupProductCreateSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    description: z
      .string()
      .max(255, 'Description cannot exceed 255 characters')
      .optional(),
    maxBuyAmountEachPerson: z
      .number()
      .int('Max buy amount each person must be an integer')
      .positive('Max buy amount each person must be a positive integer'),
    productIds: z
      .array(z.string().uuid('Product ID must be a valid string'))
      .nonempty('Product IDs cannot be empty'),
    criterias: z
      .array(
        z.object({
          threshold: z
            .number()
            .int('Threshold must be an integer')
            .positive('Threshold must be a positive integer'),
          voucher: VoucherCreateSchema.shape.body,
        })
      )
      .nonempty('Criterias cannot be empty'),
    brandId: z.string().uuid('Brand ID must be a valid string'),
  }),
});

export class GroupProductRequest {
  @Expose()
  name: string;
  @Expose()
  description?: string;
  @Expose()
  maxBuyAmountEachPerson: number;
  @Expose()
  productIds: string[];
  @Expose()
  criterias: {
    threshold: number;
    voucher: VoucherRequest;
  }[];
  @Expose()
  brandId: string;
}
