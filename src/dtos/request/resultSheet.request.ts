import { z } from "zod";
import { ResultSheetSectionCreateSchema } from "./resultSheetSection.request";

export const ResultSheetCreateSchema = z.object({
  body: z.object({
    title: z.string(),
    resultSheetSections: z
      .array(ResultSheetSectionCreateSchema.shape.body)
      .optional(),
  }),
});

export const ResultSheetUpdateSchema = z.object({
  body: ResultSheetCreateSchema.shape.body.partial(),
});
