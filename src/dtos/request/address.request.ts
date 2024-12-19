import { z } from "zod";
import { AddressEnum } from "../../utils/enum";

export const AddressCreateSchema = z.object({
  body: z.object({
    fullName: z.string().max(100).optional(),
    phoneNumber: z.string().max(100).optional(),
    district: z.string().max(100).optional(),
    ward: z.string().max(100).optional(),
    detailAddress: z.string().max(100),
    province: z.string().max(255).optional(),
    fullAddress: z.string().max(100).optional(),
    type: z.nativeEnum(AddressEnum).default(AddressEnum.OTHER).optional(),
    account: z.string().optional(),
  }),
});

export const AddressUpdateSchema = z.object({
  body: AddressCreateSchema.partial(),
});
