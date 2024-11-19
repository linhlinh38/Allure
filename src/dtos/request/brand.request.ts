import { z } from 'zod';
import { GenderEnum, RoleEnum, StatusEnum } from '../../utils/enum';

export const BrandCreateSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(100, 'Name cannot exceed 100 characters'),
    logo: z.string().max(255, 'Logo cannot exceed 255 characters').optional(),
    document: z
      .string()
      .min(1, 'Document is required')
      .max(255, 'Document cannot exceed 255 characters'),
    description: z
      .string()
      .max(255, 'Description cannot exceed 255 characters')
      .optional(),
    email: z.string().email('Invalid email address'),
    phone: z
      .string()
      .regex(/^[0-9]{10,15}$/, 'Phone must be a string with 10 to 15 digits')
      .optional(),
    address: z
      .string()
      .max(255, 'Address cannot exceed 255 characters')
      .optional(),
    status: z.nativeEnum(StatusEnum).optional().default(StatusEnum.PENDING),
  }),
});

export const BrandUpdateSchema = z.object({
  body: BrandCreateSchema.partial(),
});

export const BrandUpdateStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(StatusEnum).optional(),
  }),
});