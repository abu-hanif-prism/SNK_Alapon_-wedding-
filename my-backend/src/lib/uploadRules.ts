import { z } from "zod";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES_PER_REQUEST = 20;

// HEIC is not accepted: phones convert to JPEG in the browser file picker, and sharp's
// prebuilt binaries cannot decode HEIC.
export const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AllowedImageType = keyof typeof ALLOWED_IMAGE_TYPES;

export const objectKeyFor = (eventId: string, photoId: string, contentType: AllowedImageType) =>
  `events/${eventId}/originals/${photoId}.${ALLOWED_IMAGE_TYPES[contentType]}`;

export const variantKeyFor = (eventId: string, photoId: string, kind: "web" | "thumbnail") =>
  `events/${eventId}/variants/${photoId}/${kind}.webp`;

// Keeps only the file name (no path), strips control characters, caps the length.
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 200);
  return cleaned.length > 0 ? cleaned : "photo";
}

export const uploadFileSchema = z.object({
  filename: z.string().min(1).max(300),
  contentType: z.enum(Object.keys(ALLOWED_IMAGE_TYPES) as [AllowedImageType, ...AllowedImageType[]]),
  byteSize: z.number().int().min(1).max(MAX_FILE_BYTES),
});

export const uploadFilesSchema = z.array(uploadFileSchema).min(1).max(MAX_FILES_PER_REQUEST);

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
