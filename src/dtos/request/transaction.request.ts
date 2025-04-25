import { Expose } from 'class-transformer';
import { z } from 'zod';
import {
  OrderEnum,
  PayTypeEnum,
  StatisticsTimeEnum,
  TransactionTypeEnum,
} from '../../utils/enum';

export const GetStatisticsSchema = z.object({
  body: z.object({
    type: z.nativeEnum(StatisticsTimeEnum),
    startDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'Start time must be a valid date string'
      )
      .optional(),
    endDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'End time must be a valid date string'
      )
      .optional(),
  }),
});

export const PaySchema = z.object({
  body: z.object({
    orderId: z.string().optional(),
    id: z.string().uuid(),
    type: z.nativeEnum(PayTypeEnum),
  }),
});

export class PayRequest {
  @Expose()
  orderId: string;

  @Expose()
  id: string;

  @Expose()
  type: PayTypeEnum;
}

export const FilterTransactionSchema = z.object({
  body: z.object({
    types: z.array(z.nativeEnum(TransactionTypeEnum)).optional(),
    startDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'Start date must be a valid date string'
      )
      .optional(),
    endDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'End date must be a valid date string'
      )
      .optional(),
    accountId: z.string().uuid().optional(),
  }),
});

export const OrderStatisticsSchema = z.object({
  body: z.object({
    brandId: z.string().uuid().optional(),
  }),
});

export const GetBrandRevenueStatisticsSchema = z.object({
  body: z.object({
    startDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'Start date must be a valid date string'
      )
      .optional(),
    endDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'End date must be a valid date string'
      )
      .optional(),
    brandId: z.string().uuid(),
  }),
});

export const GetConsultantRevenueStatisticsSchema = z.object({
  body: z.object({
    startDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'Start date must be a valid date string'
      )
      .optional(),
    endDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'End date must be a valid date string'
      )
      .optional(),
    consultantId: z.string().uuid(),
  }),
});

export const GetDailyBookingStatisticsSchema = z.object({
  body: z.object({
    startDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'Start date must be a valid date string'
      )
      .optional(),
    endDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'End date must be a valid date string'
      )
      .optional(),
    consultantId: z.string().uuid().optional(),
  }),
});

export const GetDailyOrderStatisticsSchema = z.object({
  body: z.object({
    startDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'Start date must be a valid date string'
      )
      .optional(),
    endDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'End date must be a valid date string'
      )
      .optional(),
    orderType: z.union([z.nativeEnum(OrderEnum), z.literal('ALL')]).optional(),
    productIds: z.array(z.string().uuid()).optional(),
    eventIds: z.array(z.string().uuid()).optional(),
    groupProductIds: z.array(z.string().uuid()).optional(),
    brandId: z.string().uuid().optional(),
  }),
});


export class GetDailyBookingStatisticsRequest {
  @Expose()
  startDate: Date;

  @Expose()
  endDate: Date;

  @Expose()
  consultantId: string;
}

export class GetDailyOrderStatisticsRequest {
  @Expose()
  startDate: Date;

  @Expose()
  endDate: Date;

  @Expose()
  orderType: OrderEnum | 'ALL';

  @Expose()
  productIds: string[];

  @Expose()
  eventIds: string[];

  @Expose()
  groupProductIds: string[];

  @Expose()
  brandId: string;
}

export class FilterTransactionRequest {
  @Expose()
  types: TransactionTypeEnum[];

  @Expose()
  startDate: Date;

  @Expose()
  endDate: Date;

  @Expose()
  accountId: string;
}

export class GetStatisticsRequest {
  @Expose()
  type: StatisticsTimeEnum;

  @Expose()
  startDate: Date;

  @Expose()
  endDate: Date;
}
