import { z } from 'zod';
import {
  DiscountTypeEnum,
  StatusEnum,
  VoucherApplyTypeEnum,
  VoucherVisibilityEnum,
} from '../../utils/enum';
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
      .string()
      .transform((str) => (str ? new Date(str) : undefined))
      .refine((date) => !date || date > new Date(), {
        message: 'Start Time must be greater than the current time.',
      }),
    endTime: z
      .string()
      .transform((str) => (str ? new Date(str) : undefined))
      .refine((date) => !date || date > new Date(), {
        message: 'End Time must be greater than the current time.',
      }),
    applyType: z.nativeEnum(VoucherApplyTypeEnum),
    visibility: z.nativeEnum(VoucherVisibilityEnum),
    applyProductIds: z.array(z.string()).optional().nullable(),
    status: z.nativeEnum(StatusEnum).optional().default(StatusEnum.ACTIVE),
    brandId: z.string().optional(),
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

export const CheckoutItemSchema = z.object({
  body: z.object({
    brandItems: z
      .array(
        z.object({
          classificationId: z.string(),
          quantity: z.number().int().positive(),
        })
      )
      .nonempty(),
    brandId: z.string().uuid(),
  }),
});

export const GetBestShopVouchersSchema = z.object({
  body: z.object({
    checkoutItems: z
      .array(
        z.object({
          brandItems: z
            .array(
              z.object({
                classificationId: z.string(),
                quantity: z.number().int().positive(),
              })
            )
            .nonempty(),
          brandId: z.string().uuid(),
        })
      )
      .nonempty(),
  }),
});

export const GetBestPlatformVouchersSchema = z.object({
  body: z.object({
    checkoutItems: z
      .array(
        z.object({
          classificationId: z.string(),
          quantity: z.number().int().positive(),
        })
      )
      .nonempty(),
  }),
});

export const CanApplyVoucherSchema = z.object({
  body: z.object({
    checkoutItems: z
      .array(
        z.object({
          classificationId: z.string(),
          quantity: z.number().int().positive(),
        })
      )
      .nonempty(),
    brandId: z.string().uuid().optional().nullable(),
    voucherId: z.string().uuid(),
  }),
});

export class CanApplyVoucherRequest {
  @Expose()
  checkoutItems: CheckoutItem[];

  @Expose()
  brandId?: string;

  @Expose()
  voucherId: string;
}

export class GetBestPlatformVouchersRequest {
  @Expose()
  checkoutItems: CheckoutItem[];
}

export class GetBestShopVouchersRequest {
  @Expose()
  checkoutItems: CheckoutItemRequest[];
}

export class CheckoutItemRequest {
  @Expose()
  brandItems: CheckoutItem[];
  @Expose()
  brandId: string;
}

export class CheckoutItem {
  @Expose()
  classificationId: string;
  @Expose()
  quantity: number;
}

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

  @Expose()
  applyType: VoucherApplyTypeEnum;

  @Expose()
  visibility: VoucherVisibilityEnum;

  @Expose()
  applyProductIds: string[];

  @Expose()
  brandId: string;
}
