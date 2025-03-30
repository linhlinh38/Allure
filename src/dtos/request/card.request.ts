import { z } from 'zod';
import { Expose } from 'class-transformer';

export const CardCreateSchema = z.object({
  body: z.object({
    cardNumber: z.string().max(16),
    cardHolder: z.string().min(1, 'Card holder name is required'),
    expirationDate: z
      .string()
      .transform((str) => (str ? new Date(str) : undefined))
      .refine((date) => !date, {
        message: 'Invalid expiration date format',
      }),
    bankName: z.string().min(1, 'Bank name is required'),
    cvv: z.string().length(3, 'CVV must be 3 digits'),
    isDefault: z.boolean().optional(),
  }),
});

export const CardUpdateSchema = z.object({
  body: z.object({
    cardHolder: z.string().min(1, 'Card holder name is required').optional(),
    expirationDate: z
      .string()
      .transform((str) => (str ? new Date(str) : undefined))
      .refine((date) => !date, {
        message: 'Invalid expiration date format',
      })
      .optional(),
    bankName: z.string().min(1, 'Bank name is required').optional(),
    cvv: z.string().length(3, 'CVV must be 3 digits').optional(),
    isDefault: z.boolean().optional(),
  }),
});

export class CardCreateRequest {
  @Expose()
  cardNumber: string;

  @Expose()
  cardHolder: string;

  @Expose()
  expirationDate: string;

  @Expose()
  bankName: string;

  @Expose()
  cvv: string;

  @Expose()
  isDefault?: boolean;
}

export class CardUpdateRequest {
  @Expose()
  cardHolder?: string;

  @Expose()
  expirationDate?: Date;

  @Expose()
  bankName?: string;

  @Expose()
  cvv: string;

  @Expose()
  isDefault?: boolean;
}
