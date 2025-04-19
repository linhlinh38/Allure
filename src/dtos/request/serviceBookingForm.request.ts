import { z } from "zod";
import { QuestionCreateSchema } from "./question.request";

export const ServiceBookingFormCreateSchema = z.object({
  body: z.object({
    title: z.string().max(100, "Title must be at most 100 characters long"),
    questions: z.array(QuestionCreateSchema.shape.body).optional(),
  }),
});

export const ServiceBookingFormUpdateSchema = z.object({
  body: z.object({
    title: z
      .string()
      .max(100, "Title must be at most 100 characters long")
      .optional(),
    questions: z.array(QuestionCreateSchema.shape.body.partial()).optional(),
  }),
});
