import { Expose } from 'class-transformer';
import { z } from 'zod';

export const CreatePaymentUrlSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be positive').optional(),
    description: z
      .string()
      .max(255, 'Description cannot exceed 255 characters')
      .optional(),
  }),
});

export class CreatePaymentUrlRequest {
  @Expose()
  amount: number;
  @Expose()
  description: string;
}
