import { z } from "zod";
import { BookingStatusEnum, BookingTypeEnum, PaymentMethodEnum } from "../../utils/enum";
import { Expose } from "class-transformer";

export const BookingCreateSchema = z.object({
  body: z.object({
    startTime: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'Start time must be a valid date string'
      ),
    endTime: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'End time must be a valid date string'
      ),
    totalPrice: z.number().nonnegative().optional(),
    paymentMethod: z.nativeEnum(PaymentMethodEnum).optional(),
    voucher: z.string().optional(),
    meetUrl: z.string().optional(),
    consultantService: z.string().optional(),
    notes: z.string().optional(),
    type: z.nativeEnum(BookingTypeEnum),
    slot: z.string(),
  }),
});

export const BookingUpdateStatusSchema = z.object({
  body: z.object({
    startTime: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'Start time must be a valid date string'
      ),
    endTime: z
      .string()
      .refine(
        (value) => !isNaN(Date.parse(value)),
        'End time must be a valid date string'
      ),
  }),
});

export const GetAvailableSlotsSchema = z.object({
  body: z.object({
    status: z.nativeEnum(BookingStatusEnum),
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
}
