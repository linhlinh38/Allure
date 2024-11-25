import { z } from 'zod';
import { DiscountTypeEnum, StatusEnum, VoucherEnum } from '../../utils/enum';
import { Expose } from 'class-transformer';

export const VoucherCreateSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(100, 'Name cannot exceed 100 characters'),
    code: z
      .string()
      .min(1, 'Code is required')
      .max(50, 'Code cannot exceed 50 characters'),
    type: z.nativeEnum(VoucherEnum).default(VoucherEnum.NORMAL),
    discountType: z.nativeEnum(DiscountTypeEnum),
    discountValue: z
      .number()
      .nonnegative('Discount Value must be non-negative'),
    maxDiscount: z
      .number()
      .int('Max Discount must be integer')
      .nonnegative('Max Discount must be non-negative')
      .optional(),
    minOrderValue: z
      .number()
      .int('Min Order Value must be integer')
      .nonnegative('Min Order Value must be non-negative')
      .optional(),
    description: z
      .string()
      .max(255, 'Description cannot exceed 255 characters')
      .optional(),
    amount: z
      .number()
      .int('Amount must be integer')
      .positive('Amount must be positive')
      .optional(),
    startTime: z
      .date()
      .optional()
      .refine((date) => !date || date > new Date(), {
        message: 'Start Time must be greater than the current time.',
      }),
    endTime: z
      .date()
      .optional()
      .refine((date) => !date || date > new Date(), {
        message: 'End Time must be greater than the current time.',
      }),
    status: z.nativeEnum(StatusEnum).optional().default(StatusEnum.ACTIVE),
  }),
});

export const VoucherUpdateSchema = z.object({
  body: VoucherCreateSchema.partial(),
});

export const VoucherUpdateStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(StatusEnum).optional(),
  }),
});

export class VoucherRequest {
  @Expose()
  name: string;

  @Expose()
  code: string;

  @Expose()
  type: string;

  @Expose()
  discountType: string;

  @Expose()
  discountValue: number;

  @Expose()
  maxDiscount: number;

  @Expose()
  minOrderValue: number;

  @Expose()
  description: string;

  @Expose()
  status: string;

  @Expose()
  amount: number;

  @Expose()
  startTime: Date;

  @Expose()
  endTime: Date;
}