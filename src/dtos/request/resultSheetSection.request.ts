import { z } from "zod";

export const ResultSheetSectionCreateSchema = z.object({
  body: z.object({
    section: z.string(),
    description: z.string(),
    mandatory: z.boolean().default(false),
    orderIndex: z
      .number()
      .int()
      .nonnegative("Order index must be a non-negative integer"),
    resultSheetId: z.string().optional(),
  }),
});

export const ResultSheetSectionUpdateSchema = z.object({
  body: ResultSheetSectionCreateSchema.shape.body.partial(),
});
