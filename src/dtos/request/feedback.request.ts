import { Expose } from 'class-transformer';
import { z } from 'zod';
import { FeedbackFilterEnum } from '../../utils/enum';

export const FeedbackCreateSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5), // Assuming rating is between 1 and 5
    content: z.string().min(25).max(500), // Adjust max length as needed
    orderDetailId: z.string().uuid(), // Assuming orderDetail has an ID
    mediaFiles: z.array(z.string()).optional(), // Assuming mediaFiles contain an ID and URL
  }),
});

export const FeedbackCreateForBookingSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5), // Assuming rating is between 1 and 5
    content: z.string().min(25).max(500), // Adjust max length as needed
    bookingId: z.string().uuid(), // Assuming orderDetail has an ID
    mediaFiles: z.array(z.string()).optional(), // Assuming mediaFiles contain an ID and URL
  }),
});
export class FeedbackCreateRequest {
  @Expose()
  rating: number;
  @Expose()
  content: string;
  @Expose()
  orderDetailId: string;
  @Expose()
  mediaFiles: string[];
}

export class FeedbackCreateForBookingRequest {
  @Expose()
  rating: number;
  @Expose()
  content: string;
  @Expose()
  bookingId: string;
  @Expose()
  mediaFiles: string[];
}

export const FeedbackFilterSchema = z.object({
  body: z.object({
    type: z.nativeEnum(FeedbackFilterEnum),
    value: z.string().optional(),
  }),
});

export const FilterConsultantFeedbackSchema = z.object({
  body: z.object({
    type: z.nativeEnum(FeedbackFilterEnum),
    value: z.string().optional().default(''),
  }),
});

export class FeedbackFilterRequest {
  @Expose()
  type: FeedbackFilterEnum;
  @Expose()
  value?: string;
}

export class FilterConsultantFeedbackRequest {
  @Expose()
  type: FeedbackFilterEnum;
  @Expose()
  value?: string;
}

export const ReplySchema = z.object({
  body: z.object({
    content: z.string().min(25).max(500),
  }),
});
