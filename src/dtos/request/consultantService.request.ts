import { z } from "zod";
import { ServiceBookingFormCreateSchema } from "./serviceBookingForm.request";
export const ConsultantServiceCreateSchema = z.object({
  body: z.object({
    price: z.number().int().nonnegative("Price must be a non-negative integer"),
    account: z.string().optional(),
    systemService: z.string(),
    serviceBookingForm: z.string().optional(),
    serviceBookingFormData:
      ServiceBookingFormCreateSchema.shape.body.optional(),
  }),
});
export const ConsultantServiceUpdateSchema = z.object({
  body: ConsultantServiceCreateSchema.partial(),
});
