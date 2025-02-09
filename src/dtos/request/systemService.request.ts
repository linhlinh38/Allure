import { z } from "zod";
import { ServiceTypeEnum } from "../../utils/enum";
import { ResultSheetCreateSchema } from "./resultSheet.request";

export const SystemServiceCreateSchema = z.object({
  body: z.object({
    name: z.string(),
    description: z.string().optional(),
    image: z.string().optional(),
    category: z.string().optional(),
    type: z.nativeEnum(ServiceTypeEnum),
    resultSheet: z.string().optional(),
    resultSheetData: ResultSheetCreateSchema.shape.body.optional(),
  }),
});

export const SystemServiceUpdateSchema = z.object({
  body: SystemServiceCreateSchema.partial(),
});
