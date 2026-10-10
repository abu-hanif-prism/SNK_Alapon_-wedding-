import { z } from "zod";

const settings = z.record(z.string(), z.unknown());

export const galleryParamsSchema = z.object({ eventId: z.uuid() });
export const sectionParamsSchema = z.object({ eventId: z.uuid(), sectionId: z.uuid() });
export const blockParamsSchema = z.object({ eventId: z.uuid(), blockId: z.uuid() });

const title = z.string().trim().min(1).max(120);
const subtitle = z.string().trim().max(200).nullable();

export const createSectionSchema = z.object({
  title,
  subtitle: subtitle.optional(),
  position: z.number().int().min(0).optional(),
});

export const updateSectionSchema = z.object({ title, subtitle }).partial();

// The complete list of ids in their new order (must contain every item exactly once).
export const reorderSchema = z.object({ ids: z.array(z.uuid()).min(1).max(300) });

export const createBlockSchema = z.object({
  blockTypeId: z.uuid(),
  position: z.number().int().min(0).optional(),
  settings: settings.optional(),
});

export const updateBlockSchema = z.object({ blockTypeId: z.uuid(), settings }).partial();

export const moveBlockSchema = z.object({
  sectionId: z.uuid(),
  position: z.number().int().min(0).optional(),
});

// Replaces the photos of a block, in display order (the array index is the slot).
export const setBlockPhotosSchema = z.object({
  photos: z
    .array(
      z.object({
        photoId: z.uuid(),
        captionOverride: z.string().trim().max(300).nullable().optional(),
        crop: z.record(z.string(), z.unknown()).nullable().optional(),
      }),
    )
    .max(6),
});

// The whole website in one go: chapters in order, each with its photos in order.
export const curationSchema = z.object({
  chapters: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        photoIds: z.array(z.uuid()).max(300),
      }),
    )
    .max(60),
});

export const coverSchema = z.object({ photoId: z.uuid().nullable() });

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type UpdateBlockInput = z.infer<typeof updateBlockSchema>;
export type MoveBlockInput = z.infer<typeof moveBlockSchema>;
export type SetBlockPhotosInput = z.infer<typeof setBlockPhotosSchema>;
