import { z } from "zod";

export const ServiceImageCreateSchema = z.object({
  body: z.object({
    name: z.string().max(255).optional(),
    fileUrl: z.string(),
    systemService: z.string().optional(),
    consultantService: z.string().optional(),
    question: z.string().optional(),
  }),
});

export const ServiceImageUpdateSchema = z.object({
  body: ServiceImageCreateSchema.partial(),
});
