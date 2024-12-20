import { z } from "zod";
import {
  AddressEnum,
  GenderEnum,
  RoleEnum,
  StatusEnum,
} from "../../utils/enum";
import moment from "moment";
import { AddressCreateSchema } from "./address.request";
import { FileCreateSchema } from "./file.request";

export const AccountCreateSchema = z.object({
  body: z.object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(100, "First name cannot exceed 100 characters")
      .optional(),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(100, "Last name cannot exceed 100 characters")
      .optional(),
    username: z
      .string()
      .min(1, "Username is required")
      .max(100, "Username cannot exceed 100 characters")
      .optional(),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .optional(),
    role: z.string(),
    url: z.string().optional(),
    gender: z.nativeEnum(GenderEnum).optional(),
    avatar: z.string().min(1, "avatar must more than 1 character").optional(),
    phone: z
      .string()
      .regex(/^[0-9]{10,15}$/, "Phone must be a string with 10 to 15 digits")
      .optional(),
    dob: z
      .string()
      .refine(
        (value) =>
          value === "" ||
          (moment(value, "YYYY-MM-DD").isValid() &&
            moment(value, "YYYY-MM-DD").isBefore(
              moment(new Date(), "YYYY-MM-DD")
            )),
        {
          message: "Date of birth must be a valid date (YYYY-MM-DD)",
        }
      )
      .optional(),
    address: AddressCreateSchema.shape.body.optional(),
    certificate: FileCreateSchema.optional(),
  }),
});

//Zod schema update (partial update)
export const AccountUpdateSchema = z.object({
  body: AccountCreateSchema.partial(),
});
