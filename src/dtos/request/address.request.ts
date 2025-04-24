import { z } from "zod";
import { AddressEnum } from "../../utils/enum";

export const AddressCreateSchema = z.object({
  body: z.object({
    fullName: z.string().max(100).optional(),
    phone: z
      .string()
      .max(100, "Phone must contain at most 100 character(s)")
      .optional(),
    district: z
      .string()
      .max(100, "District must contain at most 100 character(s)")
      .optional(),
    ward: z
      .string()
      .max(100, "Ward must contain at most 100 character(s)")
      .optional(),
    detailAddress: z.string().optional(),
    province: z
      .string()
      .max(255, "Province must contain at most 255 character(s)")
      .optional(),
    fullAddress: z.string().optional(),
    notes: z.string().optional(),
    type: z.nativeEnum(AddressEnum).default(AddressEnum.OTHER).optional(),
    account: z.string().optional(),
  }),
});

export const AddressUpdateSchema = z.object({
  body: AddressCreateSchema.partial(),
});
