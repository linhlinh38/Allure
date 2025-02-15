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
    code: z.string(),
    desc: z.string(),
    success: z.boolean(),
    data: z.object({
      orderCode: z.number(),
      amount: z.number(),
      description: z.string(),
      accountNumber: z.string(),
      reference: z.string(),
      transactionDateTime: z.string(),
      currency: z.string(),
      paymentLinkId: z.string(),
      code: z.string(),
      desc: z.string(),
      counterAccountBankId: z.string(),
      counterAccountBankName: z.string(),
      counterAccountName: z.string(),
      counterAccountNumber: z.string(),
      virtualAccountName: z.string(),
      virtualAccountNumber: z.string(),
    }),
    signature: z.string(),
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
