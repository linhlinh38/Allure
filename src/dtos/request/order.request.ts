import { z } from 'zod';
import {
  RequestStatusEnum,
  PaymentMethodEnum,
  ShippingStatusEnum,
  ActionReceivedEnum,
  OrderRequestTypeEnum,
  OrderEnum,
} from '../../utils/enum';
import { Expose } from 'class-transformer';

export const OrderNormalCreateSchema = z.object({
  body: z.object({
    addressId: z.string().min(1, 'Address id is required'),
    paymentMethod: z.nativeEnum(PaymentMethodEnum),
    notes: z
      .string()
      .min(1, 'Notes is required')
      .max(255, 'Notes cannot exceed 255 characters')
      .optional(),
    orders: z
      .array(
        z.object({
          brandId: z.string().optional(),
          shopVoucherId: z.string().optional(),
          message: z.string().max(255).optional(),
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
                livestreamId: z.string().optional(),
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
    statusList: z.array(z.nativeEnum(ShippingStatusEnum)).optional(),
  }),
});

export class SearchOrderRequest {
  @Expose()
  search: string;

  @Expose()
  statusList: ShippingStatusEnum[];
}

export const UpdateOrderStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ShippingStatusEnum),
    mediaFiles: z.array(z.string()).optional(),
  }),
});

export class UpdateOrderStatusRequest {
  @Expose()
  status: ShippingStatusEnum;

  @Expose()
  mediaFiles: string[];
}

export const CancelOrderSchema = z.object({
  body: z.object({
    reason: z.string().min(1, 'Reason is required'),
  }),
});

export const CancelOrderStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(RequestStatusEnum).optional(),
  }),
});

export const RequestRefundSchema = z.object({
  body: z.object({
    reason: z.string(),
    mediaFiles: z.array(z.string()),
  }),
});

export const RequestComlaintSchema = z.object({
  body: z.object({
    reason: z.string(),
    mediaFiles: z.array(z.string()),
  }),
});

export const RequestStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(RequestStatusEnum).optional(),
    mediaFiles: z.array(z.string()).optional(),
    reasonRejected: z.string().optional(),
  }),
});

export const TakeReceivedActionSchema = z.object({
  body: z.object({
    action: z.nativeEnum(ActionReceivedEnum),
  }),
});

export const GetMyRequestsSchema = z.object({
  body: z.object({
    statusList: z.array(z.nativeEnum(RequestStatusEnum)).optional(),
    types: z.array(z.nativeEnum(OrderRequestTypeEnum)).optional(),
  }),
});

export const OrderFilterRequestSchema = z.object({
  body: z.object({
    search: z.string().optional(),
    types: z.array(z.nativeEnum(OrderEnum)).optional(),
    statuses: z.array(z.nativeEnum(ShippingStatusEnum)).optional(),
    paymentMethods: z.array(z.nativeEnum(PaymentMethodEnum)).optional(),
    productIds: z.array(z.string()).optional(),
  }),
});

export class OrderFilterRequest {
  @Expose()
  search: string;

  @Expose()
  types: OrderEnum[];

  @Expose()
  statuses: ShippingStatusEnum[];

  @Expose()
  paymentMethods: PaymentMethodEnum[];

  @Expose()
  productIds: string[];
}

export class GetMyRequestsRequest {
  @Expose()
  types: OrderRequestTypeEnum[];

  @Expose()
  statusList: RequestStatusEnum[];
}

export class MakeDicisionRefundRequest {
  @Expose()
  status: RequestStatusEnum;

  @Expose()
  reasonRejected: string;

  @Expose()
  mediaFiles: string[];
}

export class MakeDicisionRejectRefundRequest {
  @Expose()
  status: RequestStatusEnum;

  @Expose()
  reasonRejected: string;
}

export class MakeDicisionComplaintRequest {
  @Expose()
  status: RequestStatusEnum;

  @Expose()
  reasonRejected: string;
}

export class RequestRefundRequest {
  @Expose()
  reason: string;

  @Expose()
  mediaFiles: string[];
}

export class ComplaintRequestRequest {
  @Expose()
  reason: string;

  @Expose()
  mediaFiles: string[];
}

export class OrderNormalRequest {
  @Expose()
  addressId: string;

  @Expose()
  paymentMethod: PaymentMethodEnum;

  @Expose()
  notes: string;

  @Expose()
  orders: Array<{
    brandId: string;
    shopVoucherId?: string;
    message: string;
    items: Array<{
      productClassificationId: string;
      quantity: number;
      livestreamId?: string;
    }>;
  }>;

  @Expose()
  platformVoucherId?: string;
}

export class PreOrderRequest {
  @Expose()
  addressId: string;

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

export const OrderRequestFilterSchema = z.object({
  body: z.object({
    statuses: z.array(z.nativeEnum(RequestStatusEnum)).optional(),
    types: z.array(z.nativeEnum(OrderRequestTypeEnum)).optional(),
  }),
});

export class OrderRequestFilterRequest {
  @Expose()
  statuses: RequestStatusEnum[];

  @Expose()
  types: OrderRequestTypeEnum[];
}
