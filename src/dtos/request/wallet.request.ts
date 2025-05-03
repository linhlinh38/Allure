import { Expose } from 'class-transformer';
import { z } from 'zod';

export const WalletCreateSchema = z.object({
  body: z.object({
    balance: z.number().min(0, 'Balance must be non-negative').optional(),
    ownerId: z.string().uuid('Invalid owner ID')
  }),
});

export const WalletUpdateSchema = z.object({
  body: z.object({
    balance: z.number().min(0, 'Balance must be non-negative'),
  }),
});

export const DepositSchema = z.object({
  body: z.object({
    id: z.string(),
  }),
});

export class DepositRequest {
  @Expose()
  id: string;
}

export class WalletCreateRequest {
  @Expose()
  balance: number;
  @Expose()
  ownerId: string;
}
