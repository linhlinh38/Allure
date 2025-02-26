import { z } from "zod";
import { ServiceTypeEnum } from "../../utils/enum";
import { ConsultationCriteriaCreateSchema } from "./consultationCriteria.request";
import { ServiceImageCreateSchema } from "./serviceImageRequest";

export const SystemServiceCreateSchema = z.object({
  body: z.object({
    name: z.string(),
    description: z.string().optional(),
    images: z.array(ServiceImageCreateSchema.shape.body).optional(),
    category: z.string().optional(),
    type: z.nativeEnum(ServiceTypeEnum),
    consultationCriteria: z.string().optional(),
    consultationCriteriaData:
      ConsultationCriteriaCreateSchema.shape.body.optional(),
  }),
});

export const SystemServiceUpdateSchema = z.object({
  body: SystemServiceCreateSchema.partial(),
});
