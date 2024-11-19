import { z } from "zod";
import { AddressEnum, FileEnum } from "../../utils/enum";

export const FileCreateSchema = z.object({
  //Validate for file
  name: z.string().max(100).optional(),
  fileUrl: z.string().max(100),
  type: z.nativeEnum(FileEnum),
  account: z.string().optional(),
});

export const FileUpdateSchema = z.object({
  body: FileCreateSchema.partial(),
});
