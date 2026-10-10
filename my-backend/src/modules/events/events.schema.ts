import { z } from "zod";
import { EventStatus } from "../../generated/prisma/enums";
import { paginationSchema } from "../../lib/params";
import { isReservedSlug, SLUG_PATTERN } from "../../lib/slug";
import { isValidTimezone } from "../../lib/timezone";

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(60)
  .regex(SLUG_PATTERN, "Use lowercase letters, digits and single dashes")
  .refine((value) => !isReservedSlug(value), "This slug is reserved");

// "2026-12-25" -> a Date at midnight UTC (stored in a DATE column, so no time zone shift).
const eventDate = z.iso.date().transform((value) => new Date(`${value}T00:00:00.000Z`));

const timezone = z.string().refine(isValidTimezone, "Unknown time zone");

const text = (max: number) => z.string().trim().max(max).nullable();

// Copy used by the public templates (intro and closing sections).
const content = z
  .object({
    introQuote: z.string().trim().max(300),
    introText: z.string().trim().max(600),
    closingTitle: z.string().trim().max(120),
    closingText: z.string().trim().max(600),
  })
  .partial()
  .strict();

const editableFields = {
  title: z.string().trim().min(1).max(120),
  coupleNames: z.string().trim().min(1).max(120),
  brideName: text(60),
  groomName: text(60),
  location: z.string().trim().min(1).max(200),
  venue: text(120),
  eventDate,
  timezone,
  welcomeMessage: text(200),
  content: content.nullable(),
  approvalRequired: z.boolean(),
  allowViewerDownload: z.boolean(),
  requireGuestName: z.boolean(),
  allowGuestNotes: z.boolean(),
  // 4 digits that guests and viewers must enter; null removes the PIN (link-only access).
  accessPin: z.string().regex(/^\d{4}$/, "The PIN must be exactly 4 digits").nullable(),
  perGuestUploadLimit: z.number().int().min(1).max(500),
  eventUploadLimit: z.number().int().positive().nullable(),
  themeOverrides: z.record(z.string(), z.unknown()).nullable(),
  templateVersionId: z.uuid(),
};

// Either coupleNames, or bride and groom (then "Amira & Rayhan" is built from them).
export const createEventSchema = z
  .object({
    subscriptionId: z.uuid(),
    slug: slug.optional(),
    ...editableFields,
    title: editableFields.title.optional(),
    coupleNames: editableFields.coupleNames.optional(),
    brideName: editableFields.brideName.optional(),
    groomName: editableFields.groomName.optional(),
    venue: editableFields.venue.optional(),
    welcomeMessage: editableFields.welcomeMessage.optional(),
    content: editableFields.content.optional(),
    timezone: timezone.default("Asia/Dhaka"),
    approvalRequired: editableFields.approvalRequired.default(false),
    allowViewerDownload: editableFields.allowViewerDownload.default(false),
    requireGuestName: editableFields.requireGuestName.default(false),
    allowGuestNotes: editableFields.allowGuestNotes.default(true),
    accessPin: editableFields.accessPin.optional(),
    perGuestUploadLimit: editableFields.perGuestUploadLimit.default(20),
    eventUploadLimit: editableFields.eventUploadLimit.optional(),
    themeOverrides: editableFields.themeOverrides.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.coupleNames && !(value.brideName && value.groomName)) {
      ctx.addIssue({ code: "custom", path: ["coupleNames"], message: "Give coupleNames, or both brideName and groomName" });
    }
  })
  .transform((value) => {
    const coupleNames = value.coupleNames ?? `${value.brideName} & ${value.groomName}`;
    return { ...value, coupleNames, title: value.title ?? coupleNames };
  });

// slug and template can only change while the event is still a DRAFT.
export const updateEventSchema = z.object({ ...editableFields, slug }).partial();

export const slugCheckQuerySchema = z.object({
  slug: z.string().trim().toLowerCase().max(80),
  // Used to suggest alternatives such as amira-rayhan-dhaka.
  city: z.string().trim().max(60).optional(),
});

export const upgradeEventSchema = z.object({ subscriptionId: z.uuid() });

export const adminListEventsSchema = paginationSchema.extend({
  status: z.enum(EventStatus).optional(),
  q: z.string().trim().max(100).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type SlugCheckQuery = z.infer<typeof slugCheckQuerySchema>;
export type AdminListEventsQuery = z.infer<typeof adminListEventsSchema>;
