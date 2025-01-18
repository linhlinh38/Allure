import { z } from 'zod';
import { Expose } from 'class-transformer';

export const GroupBuyingCreateSchema = z.object({
  body: z.object({
    startTime: z
      .string()
      .transform((str) => (str ? new Date(str) : undefined))
      .refine((date) => !date || date >= new Date(), {
        message:
          'Start Time must be greater than or equal to the current time.',
      }),
    endTime: z
      .string()
      .transform((str) => (str ? new Date(str) : undefined))
      .refine((date) => !date || date > new Date(), {
        message: 'End Time must be greater than the current time.',
      }),
    criteriaId: z.string().uuid('Criteria ID must be a valid string'),
    groupProductId: z.string().uuid('Group Product ID must be a valid string'),
  }),
});

export const GroupBuyingJoinEventSchema = z.object({
  body: z.object({
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
      .min(1, 'Orders cannot be empty'),
    addressId: z.string().min(1, 'Address id is required'),
  }),
});

export class GroupBuyingJoinEventRequest {
  items: {
    productClassificationId: string;
    quantity: number;
  }[];
  addressId: string
}

export class GroupBuyingRequest {
  @Expose()
  startTime: Date;
  @Expose()
  endTime: Date;
  @Expose()
  criteriaId: string;
  @Expose()
  groupProductId: string;
}
