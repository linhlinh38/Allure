import { Expose } from 'class-transformer';
import { z } from 'zod';
import { StatisticsTimeEnum, TransactionStatusEnum, TransactionTypeEnum } from '../../utils/enum';

export const getStatisticsSchema = z.object({
  body: z.object({
    type: z.nativeEnum(StatisticsTimeEnum),
    startDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'Start time must be a valid date string'
      )
      .optional(),
    endDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'End time must be a valid date string'
      )
      .optional(),
  }),
});

export const FilterTransactionSchema = z.object({
  body: z.object({
    type: z.nativeEnum(TransactionTypeEnum).optional(),
    status: z.nativeEnum(TransactionStatusEnum).optional(),
    startDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'Start date must be a valid date string'
      )
      .optional(),
    endDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'End date must be a valid date string'
      )
      .optional(),
  }),
});

export class FilterTransactionRequest {
  @Expose()
  type: TransactionTypeEnum;

  @Expose()
  status: TransactionStatusEnum;

  @Expose()
  startDate: Date;

  @Expose()
  endDate: Date;
}

export class GetStatisticsRequest {
  @Expose()
  type: StatisticsTimeEnum;

  @Expose()
  startDate: Date;

  @Expose()
  endDate: Date;
}
