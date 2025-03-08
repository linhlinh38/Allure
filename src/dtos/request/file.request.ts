import { z } from "zod";
import { AddressEnum, FileEnum } from "../../utils/enum";

export const FileCreateSchema = z.object({
  body: z.object({
    name: z.string().max(100).optional(),
    fileUrl: z.string(),
    type: z.nativeEnum(FileEnum).optional(),
    account: z.string().optional(),
  }),
});

export const FileUpdateSchema = z.object({
  body: FileCreateSchema.partial(),
});
