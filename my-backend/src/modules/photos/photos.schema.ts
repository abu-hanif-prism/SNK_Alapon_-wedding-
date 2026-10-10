import { z } from "zod";
import { ApprovalStatus, ModerationAction } from "../../generated/prisma/enums";
import { paginationSchema } from "../../lib/params";

export const photoParamsSchema = z.object({ eventId: z.uuid(), photoId: z.uuid() });

export const listPhotosQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  approval: z.enum(ApprovalStatus).optional(),
  includeDeleted: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const moderateSchema = z.object({
  photoIds: z.array(z.uuid()).min(1).max(200),
  action: z.enum(ModerationAction),
  reason: z.string().trim().min(1).max(300).optional(),
});

export const updatePhotoSchema = z.object({
  caption: z.string().trim().max(300).nullable(),
});

export const downloadQuerySchema = z.object({
  variant: z.enum(["original", "web"]).default("original"),
});

export type ListPhotosQuery = z.infer<typeof listPhotosQuerySchema>;
export type ModerateInput = z.infer<typeof moderateSchema>;
export type UpdatePhotoInput = z.infer<typeof updatePhotoSchema>;
export type DownloadQuery = z.infer<typeof downloadQuerySchema>;
