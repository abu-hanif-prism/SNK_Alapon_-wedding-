import { z } from "zod";

const code = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{1,40}$/, "Use lowercase letters, digits and dashes");

const jsonObject = z.record(z.string(), z.unknown());

export const createTemplateSchema = z.object({
  code,
  name: z.string().trim().min(1).max(100),
  isActive: z.boolean().default(true),
});

export const updateTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    isActive: z.boolean(),
  })
  .partial();

// Versions are immutable once created, because events pin them. To change a layout, publish a new version.
export const createVersionSchema = z.object({
  version: z.string().trim().min(1).max(30),
  edition: z.number().int().positive(),
  layoutDefinition: jsonObject,
  themeDefaults: jsonObject,
});

const blockTypeFields = {
  name: z.string().trim().min(1).max(100),
  minPhotos: z.number().int().min(1).max(6),
  maxPhotos: z.number().int().min(1).max(6),
  responsiveConfig: jsonObject,
};

export const createBlockTypeSchema = z
  .object({ code, ...blockTypeFields })
  .refine((value) => value.minPhotos <= value.maxPhotos, {
    message: "minPhotos must be <= maxPhotos",
    path: ["minPhotos"],
  });

export const updateBlockTypeSchema = z.object(blockTypeFields).partial();

export const listTemplatesQuerySchema = z.object({
  edition: z.coerce.number().int().positive().optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type CreateVersionInput = z.infer<typeof createVersionSchema>;
export type CreateBlockTypeInput = z.infer<typeof createBlockTypeSchema>;
export type UpdateBlockTypeInput = z.infer<typeof updateBlockTypeSchema>;
export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;
