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

export class WalletCreateRequest {
  balance: number;
  accountId: string;
}
