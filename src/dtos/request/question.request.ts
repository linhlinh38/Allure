import { z } from "zod";
import { QuestionTypeEnum } from "../../utils/enum";

export const QuestionCreateSchema = z.object({
  body: z.object({
    question: z.string(),
    orderIndex: z
      .number()
      .int()
      .nonnegative("Order index must be a non-negative integer"),
    image: z.string().optional(),
    answers: z.record(z.any()).optional(),
    type: z.nativeEnum(QuestionTypeEnum),
    serviceBookingForm: z.string().optional(),
  }),
});

export const QuestionUpdateSchema = z.object({
  body: QuestionCreateSchema.partial(),
});
