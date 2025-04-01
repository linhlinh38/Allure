import { Expose } from 'class-transformer';
import { z } from 'zod';

export const CreateBankAccountSchema = z.object({
  body: z.object({
    accountNumber: z.string().min(1, 'Account number is required'),
    accountName: z.string().min(1, 'Account name is required'),
    bankName: z.string().min(1, 'Bank name is required')
  }),
});

export const UpdateBankAccountSchema = z.object({
  body: z.object({
    accountNumber: z.string().min(1, 'Account number is required').optional(),
    accountName: z.string().min(1, 'Account name is required').optional(),
    bankName: z.string().min(1, 'Bank name is required').optional(),
    isDefault: z.boolean().optional(),
  }),
});

export class CreateBankAccountRequest {
  @Expose()
  accountNumber: string;
  @Expose()
  accountName: string;
  @Expose()
  bankName: string;
}

export class UpdateBankAccountRequest {
  @Expose()
  accountNumber?: string;
  @Expose()
  accountName?: string;
  @Expose()
  bankName?: string;
  @Expose()
  isDefault?: boolean;
}
