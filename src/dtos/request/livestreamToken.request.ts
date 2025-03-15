import { z } from "zod";
import { RtcRole } from "agora-access-token";

// Define the Zod schema
const livestreamTokenSchema = z.object({
  body: z.object({
    channelName: z.string(),
    role: z.nativeEnum(RtcRole),
    tokenExpirationInSecond: z.number().optional(),
    privilegeExpirationInSecond: z.number().optional(),
    joinChannelPrivilegeExpireInSeconds: z.number().optional(),
    pubAudioPrivilegeExpireInSeconds: z.number().optional(),
    pubVideoPrivilegeExpireInSeconds: z.number().optional(),
    pubDataStreamPrivilegeExpireInSeconds: z.number().optional(),
  }),
});

export type LivestreamTokenData = z.infer<typeof livestreamTokenSchema>["body"];
export { livestreamTokenSchema };
