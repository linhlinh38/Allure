import { z } from "zod";
import { ConsultationCriteriaSectionCreateSchema } from "./consultationCriteriaSection.request";

export const ConsultationCriteriaCreateSchema = z.object({
  body: z.object({
    title: z.string(),
    consultationCriteriaSections: z
      .array(ConsultationCriteriaSectionCreateSchema.shape.body)
      .optional(),
  }),
});

export const ConsultationCriteriaUpdateSchema = z.object({
  body: ConsultationCriteriaCreateSchema.partial(),
});
