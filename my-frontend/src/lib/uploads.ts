import { request } from "./api";
export type UploadTarget = {
  photoId: string;
  filename: string;
  upload: { url: string; method: string; headers: Record<string, string> };
};
export const fileInfo = (f: File) => ({
  filename: f.name,
  contentType: f.type,
  byteSize: f.size,
});
export function validateFiles(files: File[], limit = 20) {
  if (!files.length) throw new Error("Choose at least one photo.");
  if (files.length > Math.min(limit, 20))
    throw new Error(
      "Choose at most " + Math.min(limit, 20) + " photos in this batch.",
    );
  for (const f of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type))
      throw new Error(f.name + ": use JPG, PNG or WebP.");
    if (f.size === 0 || f.size > 25 * 1024 * 1024)
      throw new Error(f.name + ": photos must be under 25 MB and not empty.");
  }
}
export async function putFiles(
  files: File[],
  targets: UploadTarget[],
  progress: (n: number) => void,
) {
  if (files.length !== targets.length)
    throw new Error("The upload reservation is incomplete. Please try again.");
  const pending = [...files];
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const match = pending.findIndex(
      (f) => sanitizeFilename(f.name) === t.filename,
    );
    if (match === -1)
      throw new Error(
        "The upload reservation does not match your selected photos.",
      );
    const file = pending.splice(match, 1)[0];
    const r = await fetch(t.upload.url, {
      method: t.upload.method,
      headers: t.upload.headers,
      body: file,
    });
    if (!r.ok)
      throw new Error(
        "Upload interrupted. Your photos are still selected; retry when connected.",
      );
    progress(Math.round(((i + 1) / files.length) * 100));
  }
}
export const sanitizeFilename = (name: string) =>
  (name.split(/[\\/]/).pop() || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 200) || "photo";
export async function hostUpload(
  id: string,
  files: File[],
  progress: (n: number) => void,
) {
  validateFiles(files);
  const d = await request<{ uploads: UploadTarget[] }>(
    "/events/" + id + "/photos/uploads/presign",
    "POST",
    { files: files.map(fileInfo) },
  );
  await putFiles(files, d.uploads, progress);
  const done = await request<{ failed: unknown[] }>(
    "/events/" + id + "/photos/uploads/complete",
    "POST",
    {
      files: files.map((f, i) => ({
        ...fileInfo(f),
        photoId: d.uploads[i].photoId,
      })),
    },
  );
  if (done.failed?.length)
    throw new Error(
      done.failed.length +
        " files could not be verified. Please refresh and retry those files.",
    );
}
