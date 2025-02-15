import { Expose } from 'class-transformer';
import { z } from 'zod';

export const WalletCreateSchema = z.object({
  body: z.object({
    balance: z.number().min(0).optional(),
    ownerId: z.string().uuid(),
  }),
});

export const WalletUpdateSchema = z.object({
  body: z.object({
    balance: z.number().min(0),
  }),
});

export const DepositSchema = z.object({
  body: z.object({
    id: z.string(),
  }),
});

export class DepositRequest {
  id: string;
}

export class WalletCreateRequest {
  @Expose()
  balance: number;
  @Expose()
  ownerId: string;
}
