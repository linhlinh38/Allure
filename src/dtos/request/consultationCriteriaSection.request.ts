import { z } from "zod";

export const ConsultationCriteriaSectionCreateSchema = z.object({
  body: z.object({
    section: z.string(),
    description: z.string(),
    mandatory: z.boolean().default(false),
    orderIndex: z
      .number()
      .int()
      .nonnegative("Order index must be a non-negative integer"),
    consultationCriteria: z.string().optional(),
  }),
});

export const ConsultationCriteriaSectionUpdateSchema = z.object({
  body: ConsultationCriteriaSectionCreateSchema.partial(),
});
