import { z } from "zod";
import {
  BookingStatusEnum,
  BookingTypeEnum,
  PaymentMethodEnum,
} from "../../utils/enum";
import { Expose } from "class-transformer";

export const BookingCreateSchema = z.object({
  body: z.object({
    startTime: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        "Start time must be a valid date string"
      )
      .optional(),
    endTime: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        "End time must be a valid date string"
      )
      .optional(),
    totalPrice: z.number().nonnegative('Total price must be non-negative').optional(),
    paymentMethod: z.nativeEnum(PaymentMethodEnum).optional(),
    voucher: z.string().optional(),
    meetUrl: z.string().optional(),
    consultantService: z.string().optional(),
    notes: z.string().optional(),
    type: z.nativeEnum(BookingTypeEnum),
    slot: z.string().uuid('Invalid slot ID').optional(),
    brandId: z.string().uuid('Invalid brand ID').optional(),
  }),
});

export const BookingUpdateStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(BookingStatusEnum),
  }),
});

export const GetSomeoneSlotsSchema = z.object({
  body: z.object({
    startDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        "Start time must be a valid date string"
      ),
    endDate: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        "End time must be a valid date string"
      ),
  }),
});

export const NoteResultSchema = z.object({
  body: z.object({
    resultNote: z.string(),
  }),
});

export class BookingRequest {
  @Expose()
  startTime: Date;

  @Expose()
  endTime: Date;

  @Expose()
  totalPrice: number;

  @Expose()
  paymentMethod: PaymentMethodEnum;

  @Expose()
  voucher: string;

  @Expose()
  consultantService: string;

  @Expose()
  notes: string;

  @Expose()
  meetUrl: string;

  @Expose()
  type: BookingTypeEnum;

  @Expose()
  slot: string;

  @Expose()
  account: string;

  @Expose()
  brandId: string;
}
