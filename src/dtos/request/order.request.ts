import { z } from 'zod';
import { ShippingStatusEnum, StatusEnum } from '../../utils/enum';
import { Expose } from 'class-transformer';

export const OrderNormalCreateSchema = z.object({
  body: z.object({
    shippingAddress: z.string().min(1, 'Shipping Address is required'),
    phone: z
      .string()
      .regex(/^[0-9]{10,15}$/, 'Phone must be a string with 10 to 15 digits'),
    paymentMethod: z.string().min(1, 'Payment Method is required'),
    notes: z
      .string()
      .min(1, 'Notes is required')
      .max(255, 'Notes cannot exceed 255 characters')
      .optional(),
    orders: z
      .array(
        z.object({
          shopVoucherId: z.string().optional(),
          items: z
            .array(
              z.object({
                productClassificationId: z
                  .string()
                  .min(1, 'Product Classification ID is required'),
                quantity: z
                  .number()
                  .int()
                  .positive('Quantity must be a positive integer'),
              })
            )
            .min(1, 'Items cannot be empty'),
        })
      )
      .min(1, 'Orders cannot be empty'),
    platformVoucherId: z.string().optional(),
  }),
});

export const OrderUpdateSchema = z.object({
  body: OrderNormalCreateSchema.partial(),
});

export const OrderUpdateStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ShippingStatusEnum).optional(),
  }),
});

export const SearchOrderSchema = z.object({
  body: z.object({
    search: z.string().trim().min(1, 'Search input is required').optional(),
    status: z.nativeEnum(ShippingStatusEnum).optional(),
  }),
});

export class OrderNormalRequest {
  @Expose()
  shippingAddress: string;

  @Expose()
  phone: string;

  @Expose()
  paymentMethod: string;

  @Expose()
  notes: string;

  @Expose()
  orders: Array<{
    shopVoucherId?: string;
    items: Array<{
      productClassificationId: string;
      quantity: number;
    }>;
  }>;

  @Expose()
  platformVoucherId?: string;
}

export class PreOrderRequest {
  @Expose()
  shippingAddress: string;

  @Expose()
  phone: string;

  @Expose()
  paymentMethod: string;

  @Expose()
  notes: string;

  @Expose()
  shopVoucherId?: string;

  @Expose()
  productClassificationId: string;

  @Expose()
  quantity: number;

  @Expose()
  platformVoucherId?: string;
}
