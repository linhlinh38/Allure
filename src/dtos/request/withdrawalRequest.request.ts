import { z } from 'zod';
import { WithdrawalStatusEnum } from '../../utils/enum';
import { Expose } from 'class-transformer';

export const CreateWithdrawalRequestSchema = z.object({
  body: z.object({
    amount: z.number().min(1, 'Amount must be greater than 0'),
    bankAccountId: z.string().uuid(),
  }),
});

export const UpdateWithdrawalRequestSchema = z.object({
  body: z.object({
    status: z.nativeEnum(WithdrawalStatusEnum),
    rejectedReason: z.string().optional(),
  }),
});

export class CreateWithdrawalRequest {
  @Expose()
  amount: number;

  @Expose()
  bankAccountId: string;
}

export class UpdateWithdrawalRequest {
  @Expose()
  status: WithdrawalStatusEnum;

  @Expose()
  rejectedReason?: string;
}
