import { randomUUID } from "node:crypto";
import { requestProcessing } from "../../jobs/photoProcessor";
import { HttpError } from "../../lib/httpError";
import { prisma } from "../../lib/prisma";
import { storage } from "../../lib/storage";
import { objectKeyFor, sanitizeFilename } from "../../lib/uploadRules";
import { assertEditable, getOwnedEvent, isSubscriptionUsable } from "../events/events.service";
import { assertStorageAvailable, lockSubscription } from "./storage-quota";
import type { HostCompleteInput, HostPresignInput } from "./uploads.schema";

// Hosts upload directly, any time while the subscription is active: no upload link, no per-guest
// or per-event limit, photos are approved immediately. Only the storage quota applies.
// Flow: presign (nothing stored) -> browser PUTs files -> complete (verifies files, creates rows).

async function requireUploadableEvent(hostId: string, eventId: string) {
  const event = await getOwnedEvent(hostId, eventId);
  assertEditable(event);

  const subscription = await prisma.subscription.findUniqueOrThrow({ where: { id: event.subscriptionId } });
  if (!isSubscriptionUsable(subscription)) throw HttpError.conflict("This subscription is not active");

  return event;
}

export async function presignHostUploads(hostId: string, eventId: string, input: HostPresignInput) {
  const event = await requireUploadableEvent(hostId, eventId);

  const totalBytes = input.files.reduce((sum, file) => sum + BigInt(file.byteSize), 0n);
  await prisma.$transaction((tx) => assertStorageAvailable(tx, event.subscriptionId, totalBytes));

  const uploads = await Promise.all(
    input.files.map(async (file) => {
      const photoId = randomUUID();
      return {
        photoId,
        filename: sanitizeFilename(file.filename),
        upload: await storage.presignUpload({
          key: objectKeyFor(eventId, photoId, file.contentType),
          contentType: file.contentType,
          byteSize: file.byteSize,
        }),
      };
    }),
  );

  return { uploads };
}

export async function completeHostUploads(hostId: string, eventId: string, input: HostCompleteInput) {
  const event = await requireUploadableEvent(hostId, eventId);

  // Retried requests: photos that were already created are returned, not created twice.
  const existing = await prisma.photo.findMany({ where: { id: { in: input.files.map((f) => f.photoId) } } });
  const existingById = new Map(existing.map((photo) => [photo.id, photo]));
  if (existing.some((photo) => photo.eventId !== eventId)) throw HttpError.badRequest("Unknown photoId");

  const failed: { photoId: string; reason: string }[] = [];
  const fresh: { photoId: string; filename: string; contentType: HostCompleteInput["files"][number]["contentType"]; byteSize: number; key: string }[] = [];

  await Promise.all(
    input.files
      .filter((file) => !existingById.has(file.photoId))
      .map(async (file) => {
        const key = objectKeyFor(eventId, file.photoId, file.contentType);
        const info = await storage.head(key);

        if (!info) failed.push({ photoId: file.photoId, reason: "File was not uploaded" });
        else if (info.size !== file.byteSize || info.contentType !== file.contentType) {
          failed.push({ photoId: file.photoId, reason: "File does not match what was declared" });
          await storage.deleteObject(key).catch(() => undefined);
        } else {
          fresh.push({ photoId: file.photoId, filename: sanitizeFilename(file.filename), contentType: file.contentType, byteSize: file.byteSize, key });
        }
      }),
  );

  if (fresh.length > 0) {
    const bytes = fresh.reduce((sum, file) => sum + BigInt(file.byteSize), 0n);

    await prisma.$transaction(
      async (tx) => {
        await lockSubscription(tx, event.subscriptionId);
        await assertStorageAvailable(tx, event.subscriptionId, bytes);

        await tx.photo.createMany({
          data: fresh.map((file) => ({
            id: file.photoId,
            eventId,
            uploadedByHostId: hostId,
            originalObjectKey: file.key,
            originalFilename: file.filename,
            mimeType: file.contentType,
            byteSize: BigInt(file.byteSize),
            approvalStatus: "APPROVED" as const,
          })),
        });
        await tx.event.update({ where: { id: eventId }, data: { photoCount: { increment: fresh.length }, usedBytes: { increment: bytes } } });
        await tx.subscription.update({ where: { id: event.subscriptionId }, data: { usedBytes: { increment: bytes } } });
      },
      { timeout: 15_000 },
    );

    requestProcessing();
  }

  const ids = input.files.map((file) => file.photoId).filter((id) => !failed.some((f) => f.photoId === id));
  const photos = await prisma.photo.findMany({ where: { id: { in: ids } }, orderBy: { createdAt: "asc" } });

  return {
    photos: photos.map((photo) => ({
      id: photo.id,
      filename: photo.originalFilename,
      approvalStatus: photo.approvalStatus,
      processingStatus: photo.processingStatus,
    })),
    failed,
  };
}
