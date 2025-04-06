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
    evidences: z.array(z.string()).optional(),
  }),
});

export const FilterWithdrawalRequestSchema = z.object({
  body: z.object({
    accountId: z.string().uuid().optional(),
    processedById: z.string().uuid().optional(),
    statuses: z.array(z.nativeEnum(WithdrawalStatusEnum)).optional(),
  }),
});

export const GetMyWithdrawalRequestsSchema = z.object({
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
  }),
  body: z.object({
    statuses: z.array(z.nativeEnum(WithdrawalStatusEnum)).optional(),
    processedById: z.string().uuid().optional(),
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

  @Expose()
  evidences?: string[];
}

export class FilterWithdrawalRequest {
  @Expose()
  accountId?: string;

  @Expose()
  processedById?: string;

  @Expose()
  statuses?: WithdrawalStatusEnum[];
}
