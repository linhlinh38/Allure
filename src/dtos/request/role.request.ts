import { z } from "zod";

export const RoleCreateSchema = z.object({
  body: z.object({
    role: z.string().max(100),
  }),
});

export const RoleUpdateSchema = z.object({
  body: RoleCreateSchema.partial(),
});
