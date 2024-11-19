import { z } from "zod";
import { AddressEnum } from "../../utils/enum";

export const RoleCreateSchema = z.object({
  body: z.object({
    role: z.string().max(100),
  }),
});

export const RoleUpdateSchema = z.object({
  body: RoleCreateSchema.partial(),
});
