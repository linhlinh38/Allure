import { z } from 'zod';

export const LivestreamFilterSchema = z.object({
  title: z.string().optional(),
  statuses: z.array(z.string()).optional(),
});



export type LivestreamFilterRequest = z.infer<typeof LivestreamFilterSchema>;
