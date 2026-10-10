import { randomUUID } from "node:crypto";
import type { Photo, UploadBatch } from "../../generated/prisma/client";
import { requestProcessing } from "../../jobs/photoProcessor";
import { HttpError } from "../../lib/httpError";
import { isUniqueViolation } from "../../lib/json";
import { prisma } from "../../lib/prisma";
import { storage } from "../../lib/storage";
import { objectKeyFor, sanitizeFilename } from "../../lib/uploadRules";
import { findGuest, sessionState, type LinkWithEvent } from "../guests/guests.service";
import type { CreateBatchInput } from "./uploads.schema";
import { activeReservation, assertStorageAvailable, lockSubscription } from "./storage-quota";

// How long a guest has to finish uploading after reserving. Reserved photos/bytes count against
// every limit until the batch is completed or expires.
const RESERVATION_MS = 60 * 60 * 1000;

type BatchWithPhotos = UploadBatch & { photos: Photo[] };

const summarise = (batch: UploadBatch) => ({
  id: batch.id,
  status: batch.status,
  message: batch.message,
  expiresAt: batch.expiresAt,
});

async function requireGuest(link: LinkWithEvent, cookieValue: string | null) {
  const guest = await findGuest(link.eventId, cookieValue);
  if (!guest) throw HttpError.unauthorized("Open the upload link first");
  return guest;
}

function assertOpen(link: LinkWithEvent) {
  const state = sessionState(link);
  if (state !== "open") throw new HttpError(403, "Uploads are not open for this link", { state });
}

async function presignBatch(batch: BatchWithPhotos) {
  return Promise.all(
    batch.photos.map(async (photo) => ({
      photoId: photo.id,
      filename: photo.originalFilename,
      upload: await storage.presignUpload({
        key: photo.originalObjectKey,
        contentType: photo.mimeType,
        byteSize: Number(photo.byteSize),
      }),
    })),
  );
}

// Replaying the same idempotencyKey returns the same batch instead of reserving twice.
async function describeExisting(batch: BatchWithPhotos, link: LinkWithEvent) {
  if (batch.status === "COMPLETED") {
    return { batch: summarise(batch), photos: batch.photos.map(publicPhoto) };
  }
  if (batch.status !== "RESERVED" || batch.expiresAt <= new Date()) {
    throw new HttpError(410, "This upload batch has expired. Start a new one.");
  }
  assertOpen(link);
  return { batch: summarise(batch), uploads: await presignBatch(batch) };
}

const publicPhoto = (photo: Photo) => ({
  id: photo.id,
  filename: photo.originalFilename,
  approvalStatus: photo.approvalStatus,
  processingStatus: photo.processingStatus,
});

export async function reserveBatch(link: LinkWithEvent, cookieValue: string | null, input: CreateBatchInput) {
  const guest = await requireGuest(link, cookieValue);

  const existing = await prisma.uploadBatch.findUnique({
    where: { guestId_idempotencyKey: { guestId: guest.id, idempotencyKey: input.idempotencyKey } },
    include: { photos: true },
  });
  if (existing) return describeExisting(existing, link);

  assertOpen(link);

  const totalBytes = input.files.reduce((sum, file) => sum + BigInt(file.byteSize), 0n);
  const eventId = link.eventId;

  try {
    const batch = await prisma.$transaction(
      async (tx) => {
        await lockSubscription(tx, link.event.subscriptionId);

        // Re-read everything that limits this upload, now that no one else can change it.
        const [freshGuest, event] = await Promise.all([
          tx.guest.findUniqueOrThrow({ where: { id: guest.id } }),
          tx.event.findUniqueOrThrow({ where: { id: eventId } }),
        ]);

        // The host's guest settings.
        if (event.requireGuestName && !freshGuest.displayName) {
          throw new HttpError(409, "Please tell us your name before uploading", { code: "NAME_REQUIRED" });
        }
        if (!event.allowGuestNotes && (input.message || input.files.some((file) => file.note))) {
          throw HttpError.badRequest("Messages and notes are turned off for this event");
        }

        const [guestReserved, eventReserved] = await Promise.all([
          tx.uploadBatch.aggregate({
            where: { guestId: guest.id, ...activeReservation() },
            _sum: { reservedPhotoCount: true },
          }),
          tx.uploadBatch.aggregate({ where: { eventId, ...activeReservation() }, _sum: { reservedPhotoCount: true } }),
        ]);

        const guestRemaining =
          event.perGuestUploadLimit - freshGuest.uploadedCount - (guestReserved._sum.reservedPhotoCount ?? 0);
        if (input.files.length > guestRemaining) {
          throw new HttpError(409, "You have reached your upload limit for this event", {
            remainingUploads: Math.max(0, guestRemaining),
          });
        }

        if (event.eventUploadLimit !== null) {
          const eventRemaining = event.eventUploadLimit - event.photoCount - (eventReserved._sum.reservedPhotoCount ?? 0);
          if (input.files.length > eventRemaining) {
            throw new HttpError(409, "This event has reached its upload limit", {
              remainingUploads: Math.max(0, eventRemaining),
            });
          }
        }

        await assertStorageAvailable(tx, event.subscriptionId, totalBytes);

        const created = await tx.uploadBatch.create({
          data: {
            eventId,
            guestId: guest.id,
            uploadLinkId: link.id,
            idempotencyKey: input.idempotencyKey,
            message: input.message ?? null,
            reservedPhotoCount: input.files.length,
            reservedBytes: totalBytes,
            expiresAt: new Date(Date.now() + RESERVATION_MS),
          },
        });

        await tx.photo.createMany({
          data: input.files.map((file) => {
            const id = randomUUID();
            return {
              id,
              eventId,
              uploadBatchId: created.id,
              originalObjectKey: objectKeyFor(eventId, id, file.contentType),
              originalFilename: sanitizeFilename(file.filename),
              guestNote: file.note ?? null,
              mimeType: file.contentType,
              byteSize: BigInt(file.byteSize),
            };
          }),
        });

        return tx.uploadBatch.findUniqueOrThrow({ where: { id: created.id }, include: { photos: true } });
      },
      { timeout: 15_000 },
    );

    return { batch: summarise(batch), uploads: await presignBatch(batch) };
  } catch (error) {
    // Two identical requests raced; the loser returns the winner's batch.
    if (isUniqueViolation(error)) {
      const winner = await prisma.uploadBatch.findUnique({
        where: { guestId_idempotencyKey: { guestId: guest.id, idempotencyKey: input.idempotencyKey } },
        include: { photos: true },
      });
      if (winner) return describeExisting(winner, link);
    }
    throw error;
  }
}

// The guest calls this after PUTting every file. Each file is checked in storage first;
// files that never arrived (or arrived with the wrong size/type) are dropped.
export async function completeBatch(link: LinkWithEvent, cookieValue: string | null, batchId: string) {
  const guest = await requireGuest(link, cookieValue);

  const batch = await prisma.uploadBatch.findFirst({
    where: { id: batchId, guestId: guest.id },
    include: { photos: true },
  });
  if (!batch) throw HttpError.notFound("Upload batch not found");

  if (batch.status === "COMPLETED") return { batch: summarise(batch), photos: batch.photos.map(publicPhoto), missing: [] };
  if (batch.status !== "RESERVED" || batch.expiresAt <= new Date()) {
    throw new HttpError(410, "This upload batch has expired. Start a new one.");
  }

  const checks = await Promise.all(
    batch.photos.map(async (photo) => {
      const info = await storage.head(photo.originalObjectKey);
      const ok = info !== null && info.size === Number(photo.byteSize) && info.contentType === photo.mimeType;
      return { photo, ok, info };
    }),
  );

  const verified = checks.filter((check) => check.ok).map((check) => check.photo);
  const missing = checks.filter((check) => !check.ok);

  if (verified.length === 0) {
    throw HttpError.conflict("No uploaded files were found. Upload the files, then complete the batch.");
  }

  const verifiedBytes = verified.reduce((sum, photo) => sum + photo.byteSize, 0n);

  const completed = await prisma.$transaction(
    async (tx) => {
      await lockSubscription(tx, link.event.subscriptionId);

      const claimed = await tx.uploadBatch.updateMany({
        where: { id: batch.id, status: "RESERVED", expiresAt: { gt: new Date() } },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      if (claimed.count === 0) return false; // expired or completed by a parallel request

      const event = await tx.event.findUniqueOrThrow({ where: { id: batch.eventId } });

      if (missing.length > 0) {
        await tx.photo.deleteMany({ where: { id: { in: missing.map((m) => m.photo.id) } } });
      }

      // No moderation needed: visible straight away. Otherwise the host approves each photo.
      if (!event.approvalRequired) {
        await tx.photo.updateMany({ where: { id: { in: verified.map((p) => p.id) } }, data: { approvalStatus: "APPROVED" } });
      }

      await tx.event.update({
        where: { id: event.id },
        data: { photoCount: { increment: verified.length }, usedBytes: { increment: verifiedBytes } },
      });
      await tx.subscription.update({ where: { id: event.subscriptionId }, data: { usedBytes: { increment: verifiedBytes } } });
      await tx.guest.update({ where: { id: guest.id }, data: { uploadedCount: { increment: verified.length } } });
      return true;
    },
    { timeout: 15_000 },
  );

  if (!completed) {
    const latest = await prisma.uploadBatch.findUniqueOrThrow({ where: { id: batch.id }, include: { photos: true } });
    if (latest.status === "COMPLETED") return { batch: summarise(latest), photos: latest.photos.map(publicPhoto), missing: [] };
    throw new HttpError(410, "This upload batch has expired. Start a new one.");
  }

  // Remove stray objects that failed verification (wrong size/type) so they don't linger.
  await Promise.all(
    missing.filter((m) => m.info !== null).map((m) => storage.deleteObject(m.photo.originalObjectKey).catch(() => undefined)),
  );

  requestProcessing();

  const photos = await prisma.photo.findMany({ where: { id: { in: verified.map((p) => p.id) } }, orderBy: { createdAt: "asc" } });
  return {
    batch: { ...summarise(batch), status: "COMPLETED" as const },
    photos: photos.map(publicPhoto),
    missing: missing.map((m) => ({ photoId: m.photo.id, filename: m.photo.originalFilename })),
  };
}
