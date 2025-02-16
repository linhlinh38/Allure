import { z } from "zod";
import { ServiceBookingFormCreateSchema } from "./serviceBookingForm.request";
import { ServiceImageCreateSchema } from "./serviceImageRequest";
export const ConsultantServiceCreateSchema = z.object({
  body: z.object({
    price: z.number().int().nonnegative("Price must be a non-negative integer"),
    account: z.string().optional(),
    images: z.array(ServiceImageCreateSchema.shape.body).optional(),
    systemService: z.string(),
    serviceBookingForm: z.string().optional(),
    serviceBookingFormData:
      ServiceBookingFormCreateSchema.shape.body.optional(),
  }),
});
export const ConsultantServiceUpdateSchema = z.object({
  body: ConsultantServiceCreateSchema.partial(),
});
