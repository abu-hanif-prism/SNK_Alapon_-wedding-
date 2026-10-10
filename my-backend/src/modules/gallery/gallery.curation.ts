import type { Prisma } from "../../generated/prisma/client";
import { HttpError } from "../../lib/httpError";
import { toJson } from "../../lib/json";
import { prisma } from "../../lib/prisma";
import { storage } from "../../lib/storage";
import { assertEditable, getOwnedEvent } from "../events/events.service";
import { confirmedPhoto } from "../photos/photos.service";
import { planBlocks, type BlockTypeLimits } from "./gallery.autolayout";
import { lockEvent } from "./gallery.layout";

// The simple way to build the website, as in the dashboard: choose photos, put them in chapters
// ("Pre-Wedding", "Ceremony", "Reception"), drag to reorder. The blocks are laid out automatically.
// A package limits how many photos can be on the website (event.edition).

const placeablePhoto: Prisma.PhotoWhereInput = {
  AND: [confirmedPhoto, { approvalStatus: "APPROVED", deletedAt: null }],
};

export type CurationChapter = { title: string; photoIds: string[] };

export async function getCuration(hostId: string, eventId: string) {
  const event = await getOwnedEvent(hostId, eventId);

  const sections = await prisma.gallerySection.findMany({
    where: { eventId },
    orderBy: { position: "asc" },
    include: {
      blocks: {
        orderBy: { position: "asc" },
        include: {
          placements: {
            orderBy: { slot: "asc" },
            include: {
              photo: {
                include: {
                  variants: { where: { kind: "THUMBNAIL" } },
                  uploadBatch: { select: { guest: { select: { displayName: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  const chapters = await Promise.all(
    sections.map(async (section) => ({
      id: section.id,
      title: section.title,
      photos: await Promise.all(
        section.blocks
          .flatMap((block) => block.placements)
          .map(async ({ photo }) => ({
            id: photo.id,
            width: photo.width,
            height: photo.height,
            guestName: photo.uploadBatch?.guest.displayName ?? null,
            approvalStatus: photo.approvalStatus,
            deleted: photo.deletedAt !== null,
            thumbnailUrl: photo.variants[0] ? await storage.presignDownload({ key: photo.variants[0].objectKey }) : null,
          })),
      ),
    })),
  );

  const selectedCount = new Set(chapters.flatMap((chapter) => chapter.photos.map((photo) => photo.id))).size;
  return { capacity: event.edition, selectedCount, chapters };
}

// Replaces the whole website layout with the given chapters. Empty chapters are dropped.
export async function saveCuration(hostId: string, eventId: string, input: CurationChapter[]) {
  const event = await getOwnedEvent(hostId, eventId);
  assertEditable(event);

  const chapters = input.filter((chapter) => chapter.photoIds.length > 0);
  const allIds = chapters.flatMap((chapter) => chapter.photoIds);

  if (new Set(allIds).size !== allIds.length) throw HttpError.badRequest("A photo can only be selected once");
  if (allIds.length > event.edition) {
    throw new HttpError(409, `Your package allows ${event.edition} photos on the website`, {
      code: "SLOT_LIMIT",
      capacity: event.edition,
      requested: allIds.length,
    });
  }

  const [photos, blockTypes] = await Promise.all([
    prisma.photo.findMany({
      where: { id: { in: allIds }, eventId, ...placeablePhoto },
      select: { id: true, width: true, height: true },
    }),
    prisma.blockType.findMany(),
  ]);
  if (photos.length !== allIds.length) {
    throw HttpError.badRequest("Only approved, non-deleted photos of this event can be selected");
  }

  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  const typeByCode = new Map(blockTypes.map((type) => [type.code, type]));
  const limits = new Map<string, BlockTypeLimits>(blockTypes.map((type) => [type.code, { min: type.minPhotos, max: type.maxPhotos }]));

  // Plan everything before touching the database, so a configuration problem leaves the layout alone.
  let plan: { title: string; blocks: ReturnType<typeof planBlocks> }[];
  try {
    plan = chapters.map((chapter) => ({
      title: chapter.title,
      blocks: planBlocks(chapter.photoIds.map((id) => byId.get(id)!), limits),
    }));
  } catch (error) {
    throw new HttpError(500, error instanceof Error ? error.message : "Could not lay out the photos");
  }

  await prisma.$transaction(
    async (tx) => {
      await lockEvent(tx, eventId);
      await tx.gallerySection.deleteMany({ where: { eventId } }); // blocks and placements cascade

      for (const [sectionIndex, chapter] of plan.entries()) {
        const section = await tx.gallerySection.create({
          data: { eventId, title: chapter.title, position: sectionIndex },
        });

        for (const [blockIndex, block] of chapter.blocks.entries()) {
          const created = await tx.galleryBlock.create({
            data: {
              sectionId: section.id,
              blockTypeId: typeByCode.get(block.code)!.id,
              position: blockIndex,
              settings: toJson({ plannedPhotos: block.photoIds.length }),
            },
          });
          await tx.photoPlacement.createMany({
            data: block.photoIds.map((photoId, slot) => ({ blockId: created.id, photoId, slot })),
          });
        }
      }
    },
    { timeout: 30_000 },
  );

  return getCuration(hostId, eventId);
}
