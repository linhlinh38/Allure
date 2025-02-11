import { z } from "zod";
import { QuestionTypeEnum } from "../../utils/enum";
import { ServiceImageCreateSchema } from "./serviceImageRequest";

export const QuestionCreateSchema = z.object({
  body: z.object({
    question: z.string(),
    orderIndex: z
      .number()
      .int()
      .nonnegative("Order index must be a non-negative integer"),
    images: z.array(ServiceImageCreateSchema.shape.body).optional(),
    mandatory: z.boolean().optional(),
    answers: z.record(z.any()).optional(),
    type: z.nativeEnum(QuestionTypeEnum),
    serviceBookingForm: z.string().optional(),
  }),
});

export const QuestionUpdateSchema = z.object({
  body: QuestionCreateSchema.partial(),
});
