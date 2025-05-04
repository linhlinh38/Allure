import { z } from 'zod';
import { ReportStatusEnum, ReportTypeEnum } from '../../utils/enum';
import { Expose } from 'class-transformer';

export const FilterReportsSchema = z.object({
  body: z.object({
    types: z.array(z.nativeEnum(ReportTypeEnum)).optional(),
    reason: z.string().optional(),
    statuses: z.array(z.nativeEnum(ReportStatusEnum)).optional(),
    assigneeId: z.string().uuid('Invalid assingee ID').optional(),
  }),
});

export const CreateReportSchema = z.object({
  body: z.object({
    type: z.nativeEnum(ReportTypeEnum),
    reason: z.string(),
    files: z.array(z.string()).optional(),
    orderId: z.string().uuid().optional(),
    bookingId: z.string().uuid().optional(),
  }),
});

export const UpdateStatusReportSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ReportStatusEnum),
  }),
});

export const NoteResultReportSchema = z.object({
  body: z.object({
    resultNote: z.string(),
  }),
});

export class CreateReportRequest {
  @Expose()
  type: ReportTypeEnum;
  @Expose()
  reason: string;
  @Expose()
  files: string[];
  @Expose()
  status: ReportStatusEnum;
  @Expose()
  orderId: string;
  @Expose()
  bookingId: string;
}

export class FilterReportsRequest {
  @Expose()
  types: ReportTypeEnum[];
  @Expose()
  statuses: ReportStatusEnum[];
  @Expose()
  assigneeId: string;
}
