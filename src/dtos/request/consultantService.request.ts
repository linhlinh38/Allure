import { z } from "zod";
import {
  ServiceBookingFormCreateSchema,
  ServiceBookingFormUpdateSchema,
} from "./serviceBookingForm.request";
import { ServiceImageCreateSchema } from "./serviceImageRequest";
export const ConsultantServiceCreateSchema = z.object({
  body: z.object({
    price: z
      .number({ message: "Price is required" })
      .int()
      .nonnegative("Price must be a non-negative integer"),
    account: z.string().optional(),
    description: z.string().optional(),
    detail: z.string().optional(),
    images: z.array(ServiceImageCreateSchema.shape.body).optional(),
    systemService: z
      .string({ message: "System Service is required" })
      .uuid("System Service ID must be a valid UUID"),
    serviceBookingForm: z.string().optional(),
    serviceBookingFormData:
      ServiceBookingFormCreateSchema.shape.body.optional(),
  }),
});
export const ConsultantServiceUpdateSchema = z.object({
  body: z.object({
    price: z
      .number({ message: "Price is required" })
      .int()
      .nonnegative("Price must be a non-negative integer")
      .optional(),
    account: z.string().optional(),
    description: z.string().optional(),
    detail: z.string().optional(),
    images: z.array(ServiceImageCreateSchema.shape.body).optional(),
    serviceBookingForm: z.string().optional(),
    serviceBookingFormData:
      ServiceBookingFormUpdateSchema.shape.body.optional(),
  }),
});
