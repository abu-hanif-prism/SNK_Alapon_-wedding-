import type { Prisma } from "../../generated/prisma/client";
import { HttpError } from "../../lib/httpError";
import { toSkipTake } from "../../lib/params";
import { prisma } from "../../lib/prisma";
import { storage } from "../../lib/storage";
import { assertEditable, getOwnedEvent } from "../events/events.service";
import type { DownloadQuery, ListPhotosQuery, ModerateInput, UpdatePhotoInput } from "./photos.schema";

// Photos that count as real: host uploads, or guest uploads whose batch was completed.
// (Photos still waiting for their file, in a RESERVED batch, are invisible everywhere.)
export const confirmedPhoto: Prisma.PhotoWhereInput = {
  OR: [{ uploadedByHostId: { not: null } }, { uploadBatch: { is: { status: "COMPLETED" } } }],
};

// What the public site may show: confirmed, approved, fully processed and not deleted.
export const publiclyVisiblePhoto: Prisma.PhotoWhereInput = {
  AND: [confirmedPhoto, { approvalStatus: "APPROVED", processingStatus: "READY", deletedAt: null }],
};

export async function listPhotos(hostId: string, eventId: string, query: ListPhotosQuery) {
  await getOwnedEvent(hostId, eventId);
  return listEventPhotos(eventId, query);
}

// Shared by hosts (their own events) and admins (any event).
export async function listEventPhotos(eventId: string, query: ListPhotosQuery) {
  const where: Prisma.PhotoWhereInput = {
    eventId,
    ...confirmedPhoto,
    ...(query.approval && { approvalStatus: query.approval }),
    ...(!query.includeDeleted && { deletedAt: null }),
  };

  const [photos, total] = await Promise.all([
    prisma.photo.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query),
      include: {
        variants: { where: { kind: "THUMBNAIL" }, select: { objectKey: true } },
        uploadBatch: { select: { message: true, guest: { select: { displayName: true } } } },
      },
    }),
    prisma.photo.count({ where }),
  ]);

  const items = await Promise.all(
    photos.map(async (photo) => {
      const thumbnailKey = photo.variants[0]?.objectKey;
      return {
        id: photo.id,
        originalFilename: photo.originalFilename,
        mimeType: photo.mimeType,
        byteSize: photo.byteSize,
        width: photo.width,
        height: photo.height,
        processingStatus: photo.processingStatus,
        approvalStatus: photo.approvalStatus,
        caption: photo.caption,
        guestNote: photo.guestNote,
        createdAt: photo.createdAt,
        deletedAt: photo.deletedAt,
        source: photo.uploadedByHostId ? ("host" as const) : ("guest" as const),
        guestName: photo.uploadBatch?.guest.displayName ?? null,
        guestMessage: photo.uploadBatch?.message ?? null,
        thumbnailUrl: thumbnailKey ? await storage.presignDownload({ key: thumbnailKey }) : null,
      };
    }),
  );

  return { items, total, page: query.page, limit: query.limit };
}

// Approve / reject / delete / restore several photos at once; every change is logged.
export async function moderate(hostId: string, eventId: string, input: ModerateInput) {
  const event = await getOwnedEvent(hostId, eventId);
  assertEditable(event);
  return moderatePhotos(hostId, eventId, input);
}

// Shared by hosts and admins; the caller has already checked who may moderate this event.
export async function moderatePhotos(actorId: string, eventId: string, input: ModerateInput) {
  const photoIds = [...new Set(input.photoIds)];

  const result = await prisma.$transaction(async (tx) => {
    const photos = await tx.photo.findMany({ where: { id: { in: photoIds }, eventId, ...confirmedPhoto } });
    if (photos.length !== photoIds.length) throw HttpError.notFound("One or more photos were not found");

    // Only photos the action actually changes are updated and logged.
    const applicable = photos.filter((photo) => {
      switch (input.action) {
        case "APPROVE":
          return photo.approvalStatus !== "APPROVED";
        case "REJECT":
          return photo.approvalStatus !== "REJECTED";
        case "DELETE":
          return photo.deletedAt === null;
        case "RESTORE":
          return photo.deletedAt !== null;
      }
    });
    const ids = applicable.map((photo) => photo.id);

    if (ids.length > 0) {
      switch (input.action) {
        case "APPROVE":
          await tx.photo.updateMany({ where: { id: { in: ids } }, data: { approvalStatus: "APPROVED" } });
          break;
        case "REJECT":
          await tx.photo.updateMany({ where: { id: { in: ids } }, data: { approvalStatus: "REJECTED" } });
          break;
        case "DELETE":
          // Deleted photos leave the gallery layout too.
          await tx.photoPlacement.deleteMany({ where: { photoId: { in: ids } } });
          await tx.event.updateMany({ where: { id: eventId, coverPhotoId: { in: ids } }, data: { coverPhotoId: null } });
          await tx.photo.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
          break;
        case "RESTORE":
          await tx.photo.updateMany({ where: { id: { in: ids } }, data: { deletedAt: null } });
          break;
      }

      await tx.moderationLog.createMany({
        data: ids.map((photoId) => ({
          eventId,
          photoId,
          actorId,
          action: input.action,
          reason: input.reason ?? null,
        })),
      });
    }

    return { changed: ids.length, unchanged: photos.length - ids.length };
  });

  return result;
}

export async function updateCaption(hostId: string, eventId: string, photoId: string, input: UpdatePhotoInput) {
  const event = await getOwnedEvent(hostId, eventId);
  assertEditable(event);

  const photo = await prisma.photo.findFirst({ where: { id: photoId, eventId, ...confirmedPhoto } });
  if (!photo) throw HttpError.notFound("Photo not found");

  const caption = input.caption === null || input.caption === "" ? null : input.caption;
  const updated = await prisma.photo.update({ where: { id: photoId }, data: { caption } });
  return { id: updated.id, caption: updated.caption };
}

// Hosts can always download, including after the event is archived.
export async function getHostDownloadUrl(hostId: string, eventId: string, photoId: string, query: DownloadQuery) {
  await getOwnedEvent(hostId, eventId);

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, eventId, ...confirmedPhoto },
    include: { variants: { where: { kind: "WEB" } } },
  });
  if (!photo) throw HttpError.notFound("Photo not found");

  const webVariant = photo.variants[0];
  if (query.variant === "web" && !webVariant) throw HttpError.conflict("The web version is not ready yet");

  const key = query.variant === "web" ? webVariant!.objectKey : photo.originalObjectKey;
  const baseName = photo.originalFilename.replace(/\.[^.]+$/, "");
  const downloadName = query.variant === "web" ? `${baseName}.webp` : photo.originalFilename;

  const expiresInSeconds = 5 * 60;
  return { url: await storage.presignDownload({ key, downloadName, expiresInSeconds }), expiresInSeconds };
}
