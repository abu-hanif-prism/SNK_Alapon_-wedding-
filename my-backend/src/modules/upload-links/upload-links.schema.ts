import { z } from "zod";

const instant = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

// Both optional: the default window is the event day plus the next day (in the event's time zone).
export const createUploadLinkSchema = z.object({
  opensAt: instant.optional(),
  closesAt: instant.optional(),
});

// Change when a link opens or closes (either or both).
export const updateUploadLinkSchema = createUploadLinkSchema.refine((value) => value.opensAt || value.closesAt, {
  message: "Give opensAt, closesAt or both",
});

export const eventIdParamSchema = z.object({ eventId: z.uuid() });
export const linkParamsSchema = z.object({ eventId: z.uuid(), linkId: z.uuid() });

export type CreateUploadLinkInput = z.infer<typeof createUploadLinkSchema>;
export type UpdateUploadLinkInput = z.infer<typeof updateUploadLinkSchema>;
