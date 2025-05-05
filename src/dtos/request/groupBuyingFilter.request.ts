import { z } from 'zod';

export const GroupBuyingFilterSchema = z.object({
  groupProductId: z.string().optional(),
});

export type GroupBuyingFilterRequest = z.infer<typeof GroupBuyingFilterSchema>;
