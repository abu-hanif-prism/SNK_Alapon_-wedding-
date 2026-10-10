import type { Prisma } from "../../generated/prisma/client";
import { HttpError } from "../../lib/httpError";
import { toJson } from "../../lib/json";
import { prisma } from "../../lib/prisma";
import { storage } from "../../lib/storage";
import { assertEditable, getOwnedEvent } from "../events/events.service";
import { confirmedPhoto } from "../photos/photos.service";
import {
  MAX_BLOCKS_PER_EVENT,
  MAX_SECTIONS_PER_EVENT,
  PARKING_POSITION,
  insertAt,
  lockEvent,
  renumberBlocks,
  renumberSections,
  seedGalleryFromLayout,
} from "./gallery.layout";
import type {
  CreateBlockInput,
  CreateSectionInput,
  MoveBlockInput,
  SetBlockPhotosInput,
  UpdateBlockInput,
  UpdateSectionInput,
} from "./gallery.schema";

// Photos a host may place: real uploads that are approved and not deleted.
const placeablePhoto: Prisma.PhotoWhereInput = {
  AND: [confirmedPhoto, { approvalStatus: "APPROVED", deletedAt: null }],
};

// A package limits how many different photos can be on the website.
async function assertWithinEdition(
  tx: Prisma.TransactionClient,
  event: { id: string; edition: number },
  adding: string[],
  exceptBlockId?: string,
) {
  const used = await tx.photoPlacement.findMany({
    where: { block: { section: { eventId: event.id } }, ...(exceptBlockId && { blockId: { not: exceptBlockId } }) },
    select: { photoId: true },
    distinct: ["photoId"],
  });
  const total = new Set([...used.map((row) => row.photoId), ...adding]).size;

  if (total > event.edition) {
    throw new HttpError(409, `Your package allows ${event.edition} photos on the website`, {
      code: "SLOT_LIMIT",
      capacity: event.edition,
      requested: total,
    });
  }
}

async function editableEvent(hostId: string, eventId: string) {
  const event = await getOwnedEvent(hostId, eventId);
  assertEditable(event);
  return event;
}

const plannedPhotosOf = (settings: unknown, fallback: number) => {
  const planned = (settings as { plannedPhotos?: unknown } | null)?.plannedPhotos;
  return typeof planned === "number" ? planned : fallback;
};

// ---------- reading

const treeInclude = {
  blocks: {
    orderBy: { position: "asc" },
    include: {
      blockType: true,
      placements: {
        orderBy: { slot: "asc" },
        include: { photo: { include: { variants: { where: { kind: "THUMBNAIL" } } } } },
      },
    },
  },
} satisfies Prisma.GallerySectionInclude;

export async function getGallery(hostId: string, eventId: string) {
  const event = await getOwnedEvent(hostId, eventId);

  const sections = await prisma.gallerySection.findMany({
    where: { eventId },
    orderBy: { position: "asc" },
    include: treeInclude,
  });

  const usedPhotoIds = new Set<string>();
  let plannedPhotos = 0;
  let placedPhotos = 0;
  let blockCount = 0;

  const view = await Promise.all(
    sections.map(async (section) => ({
      id: section.id,
      title: section.title,
      subtitle: section.subtitle,
      position: section.position,
      blocks: await Promise.all(
        section.blocks.map(async (block) => {
          blockCount++;
          plannedPhotos += plannedPhotosOf(block.settings, block.blockType.minPhotos);
          placedPhotos += block.placements.length;

          const photos = await Promise.all(
            block.placements.map(async (placement) => {
              usedPhotoIds.add(placement.photoId);
              const thumbnailKey = placement.photo.variants[0]?.objectKey;
              return {
                placementId: placement.id,
                slot: placement.slot,
                captionOverride: placement.captionOverride,
                crop: placement.crop,
                photo: {
                  id: placement.photo.id,
                  originalFilename: placement.photo.originalFilename,
                  width: placement.photo.width,
                  height: placement.photo.height,
                  caption: placement.photo.caption,
                  approvalStatus: placement.photo.approvalStatus,
                  processingStatus: placement.photo.processingStatus,
                  deleted: placement.photo.deletedAt !== null,
                  thumbnailUrl: thumbnailKey ? await storage.presignDownload({ key: thumbnailKey }) : null,
                },
              };
            }),
          );

          return {
            id: block.id,
            position: block.position,
            settings: block.settings,
            blockType: {
              id: block.blockType.id,
              code: block.blockType.code,
              name: block.blockType.name,
              minPhotos: block.blockType.minPhotos,
              maxPhotos: block.blockType.maxPhotos,
            },
            // Incomplete blocks (fewer than minPhotos) are hidden on the public site.
            complete: block.placements.length >= block.blockType.minPhotos,
            photos,
          };
        }),
      ),
    })),
  );

  return {
    coverPhotoId: event.coverPhotoId,
    summary: {
      edition: event.edition,
      sections: sections.length,
      blocks: blockCount,
      plannedPhotos,
      placedPhotos,
      distinctPhotos: usedPhotoIds.size,
    },
    sections: view,
  };
}

// ---------- sections

export async function createSection(hostId: string, eventId: string, input: CreateSectionInput) {
  await editableEvent(hostId, eventId);

  return prisma.$transaction(async (tx) => {
    await lockEvent(tx, eventId);

    const existing = await tx.gallerySection.findMany({ where: { eventId }, orderBy: { position: "asc" }, select: { id: true } });
    if (existing.length >= MAX_SECTIONS_PER_EVENT) {
      throw HttpError.conflict(`An event can have at most ${MAX_SECTIONS_PER_EVENT} chapters`);
    }

    const created = await tx.gallerySection.create({
      data: { eventId, title: input.title, subtitle: input.subtitle ?? null, position: PARKING_POSITION },
    });
    await renumberSections(tx, eventId, insertAt(existing.map((s) => s.id), created.id, input.position));

    return tx.gallerySection.findUniqueOrThrow({ where: { id: created.id } });
  });
}

async function findSection(tx: Prisma.TransactionClient, eventId: string, sectionId: string) {
  const section = await tx.gallerySection.findFirst({ where: { id: sectionId, eventId } });
  if (!section) throw HttpError.notFound("Chapter not found");
  return section;
}

export async function updateSection(hostId: string, eventId: string, sectionId: string, input: UpdateSectionInput) {
  await editableEvent(hostId, eventId);
  await findSection(prisma, eventId, sectionId);

  return prisma.gallerySection.update({
    where: { id: sectionId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.subtitle !== undefined && { subtitle: input.subtitle === "" ? null : input.subtitle }),
    },
  });
}

export async function reorderSections(hostId: string, eventId: string, ids: string[]) {
  await editableEvent(hostId, eventId);

  await prisma.$transaction(async (tx) => {
    await lockEvent(tx, eventId);
    const existing = await tx.gallerySection.findMany({ where: { eventId }, select: { id: true } });
    assertSameIds(existing.map((s) => s.id), ids);
    await renumberSections(tx, eventId, ids);
  });
}

export async function deleteSection(hostId: string, eventId: string, sectionId: string) {
  await editableEvent(hostId, eventId);

  await prisma.$transaction(async (tx) => {
    await lockEvent(tx, eventId);
    await findSection(tx, eventId, sectionId);

    await tx.gallerySection.delete({ where: { id: sectionId } }); // its blocks and placements cascade
    const remaining = await tx.gallerySection.findMany({ where: { eventId }, orderBy: { position: "asc" }, select: { id: true } });
    await renumberSections(tx, eventId, remaining.map((s) => s.id));
  });
}

function assertSameIds(existing: string[], given: string[]) {
  const same = existing.length === given.length && new Set(given).size === given.length && given.every((id) => existing.includes(id));
  if (!same) throw HttpError.badRequest("ids must list every existing item exactly once");
}

// ---------- blocks

async function findBlock(tx: Prisma.TransactionClient, eventId: string, blockId: string) {
  const block = await tx.galleryBlock.findFirst({
    where: { id: blockId, section: { eventId } },
    include: { blockType: true, _count: { select: { placements: true } } },
  });
  if (!block) throw HttpError.notFound("Block not found");
  return block;
}

export async function createBlock(hostId: string, eventId: string, sectionId: string, input: CreateBlockInput) {
  await editableEvent(hostId, eventId);

  return prisma.$transaction(async (tx) => {
    await lockEvent(tx, eventId);
    await findSection(tx, eventId, sectionId);

    const blockType = await tx.blockType.findUnique({ where: { id: input.blockTypeId } });
    if (!blockType) throw HttpError.badRequest("Unknown block type");

    if ((await tx.galleryBlock.count({ where: { section: { eventId } } })) >= MAX_BLOCKS_PER_EVENT) {
      throw HttpError.conflict(`An event can have at most ${MAX_BLOCKS_PER_EVENT} blocks`);
    }

    const existing = await tx.galleryBlock.findMany({ where: { sectionId }, orderBy: { position: "asc" }, select: { id: true } });
    const created = await tx.galleryBlock.create({
      data: {
        sectionId,
        blockTypeId: blockType.id,
        position: PARKING_POSITION,
        settings: toJson({ plannedPhotos: blockType.minPhotos, ...input.settings }),
      },
    });
    await renumberBlocks(tx, sectionId, insertAt(existing.map((b) => b.id), created.id, input.position));

    return tx.galleryBlock.findUniqueOrThrow({ where: { id: created.id }, include: { blockType: true } });
  });
}

export async function updateBlock(hostId: string, eventId: string, blockId: string, input: UpdateBlockInput) {
  await editableEvent(hostId, eventId);

  return prisma.$transaction(async (tx) => {
    await lockEvent(tx, eventId);
    const block = await findBlock(tx, eventId, blockId);

    if (input.blockTypeId !== undefined && input.blockTypeId !== block.blockTypeId) {
      const blockType = await tx.blockType.findUnique({ where: { id: input.blockTypeId } });
      if (!blockType) throw HttpError.badRequest("Unknown block type");
      if (block._count.placements > blockType.maxPhotos) {
        throw HttpError.conflict(`This block holds ${block._count.placements} photos but "${blockType.name}" fits ${blockType.maxPhotos}`);
      }
    }

    return tx.galleryBlock.update({
      where: { id: blockId },
      data: {
        ...(input.blockTypeId !== undefined && { blockTypeId: input.blockTypeId }),
        ...(input.settings !== undefined && { settings: toJson(input.settings) }),
      },
      include: { blockType: true },
    });
  });
}

export async function reorderBlocks(hostId: string, eventId: string, sectionId: string, ids: string[]) {
  await editableEvent(hostId, eventId);

  await prisma.$transaction(async (tx) => {
    await lockEvent(tx, eventId);
    await findSection(tx, eventId, sectionId);
    const existing = await tx.galleryBlock.findMany({ where: { sectionId }, select: { id: true } });
    assertSameIds(existing.map((b) => b.id), ids);
    await renumberBlocks(tx, sectionId, ids);
  });
}

// Moves a block to a position in the same or another chapter.
export async function moveBlock(hostId: string, eventId: string, blockId: string, input: MoveBlockInput) {
  await editableEvent(hostId, eventId);

  await prisma.$transaction(async (tx) => {
    await lockEvent(tx, eventId);
    const block = await findBlock(tx, eventId, blockId);
    const target = await findSection(tx, eventId, input.sectionId);

    const others = (sectionId: string) =>
      tx.galleryBlock.findMany({ where: { sectionId, id: { not: blockId } }, orderBy: { position: "asc" }, select: { id: true } });

    if (target.id !== block.sectionId) {
      await tx.galleryBlock.update({ where: { id: blockId }, data: { sectionId: target.id, position: PARKING_POSITION } });
      await renumberBlocks(tx, block.sectionId, (await others(block.sectionId)).map((b) => b.id));
    }
    await renumberBlocks(tx, target.id, insertAt((await others(target.id)).map((b) => b.id), blockId, input.position));
  });
}

export async function deleteBlock(hostId: string, eventId: string, blockId: string) {
  await editableEvent(hostId, eventId);

  await prisma.$transaction(async (tx) => {
    await lockEvent(tx, eventId);
    const block = await findBlock(tx, eventId, blockId);

    await tx.galleryBlock.delete({ where: { id: blockId } });
    const remaining = await tx.galleryBlock.findMany({ where: { sectionId: block.sectionId }, orderBy: { position: "asc" }, select: { id: true } });
    await renumberBlocks(tx, block.sectionId, remaining.map((b) => b.id));
  });
}

// ---------- photos in blocks

// Replaces a block's photos with exactly the given list (array index = slot).
// A photo may appear in many blocks, but only once per block.
export async function setBlockPhotos(hostId: string, eventId: string, blockId: string, input: SetBlockPhotosInput) {
  const event = await editableEvent(hostId, eventId);

  return prisma.$transaction(async (tx) => {
    await lockEvent(tx, eventId);
    const block = await findBlock(tx, eventId, blockId);

    if (input.photos.length > block.blockType.maxPhotos) {
      throw HttpError.badRequest(`"${block.blockType.name}" holds at most ${block.blockType.maxPhotos} photos`);
    }

    const photoIds = input.photos.map((photo) => photo.photoId);
    if (new Set(photoIds).size !== photoIds.length) throw HttpError.badRequest("A photo can only appear once in a block");

    const found = await tx.photo.count({ where: { id: { in: photoIds }, eventId, ...placeablePhoto } });
    if (found !== photoIds.length) throw HttpError.badRequest("Only approved, non-deleted photos of this event can be placed");

    await assertWithinEdition(tx, event, photoIds, blockId);

    await tx.photoPlacement.deleteMany({ where: { blockId } });
    await tx.photoPlacement.createMany({
      data: input.photos.map((photo, slot) => ({
        blockId,
        photoId: photo.photoId,
        slot,
        captionOverride: photo.captionOverride ? photo.captionOverride : null,
        ...(photo.crop ? { crop: toJson(photo.crop) } : {}),
      })),
    });

    return {
      blockId,
      complete: input.photos.length >= block.blockType.minPhotos,
      placements: await tx.photoPlacement.findMany({ where: { blockId }, orderBy: { slot: "asc" } }),
    };
  });
}

// Fills blocks that still have room, in gallery order, with approved photos not used anywhere yet
// (oldest uploads first). Each block is filled up to its planned size.
export async function autofill(hostId: string, eventId: string) {
  const event = await editableEvent(hostId, eventId);

  return prisma.$transaction(
    async (tx) => {
      await lockEvent(tx, eventId);

      const blocks = await tx.galleryBlock.findMany({
        where: { section: { eventId } },
        orderBy: [{ section: { position: "asc" } }, { position: "asc" }],
        include: { blockType: true, placements: { select: { photoId: true } } },
      });

      const used = new Set(blocks.flatMap((block) => block.placements.map((p) => p.photoId)));
      const candidates = (
        await tx.photo.findMany({
          where: { eventId, ...placeablePhoto },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        })
      )
        .map((photo) => photo.id)
        .filter((id) => !used.has(id));

      // Only as many new photos as the package still has room for.
      const room = Math.max(0, event.edition - used.size);
      const queue = candidates.slice(0, room);
      const leftOut = candidates.length - queue.length;
      const data: { blockId: string; photoId: string; slot: number }[] = [];

      for (const block of blocks) {
        const target = Math.min(plannedPhotosOf(block.settings, block.blockType.minPhotos), block.blockType.maxPhotos);
        for (let slot = block.placements.length; slot < target && queue.length > 0; slot++) {
          data.push({ blockId: block.id, photoId: queue.shift()!, slot });
        }
      }

      if (data.length > 0) await tx.photoPlacement.createMany({ data });
      return { placed: data.length, unplacedPhotos: queue.length + leftOut };
    },
    { timeout: 20_000 },
  );
}

// Throws away the current layout and rebuilds the empty chapters/blocks from the event's template.
export async function resetToTemplate(hostId: string, eventId: string) {
  const event = await editableEvent(hostId, eventId);

  await prisma.$transaction(async (tx) => {
    await lockEvent(tx, eventId);
    const version = await tx.templateVersion.findUniqueOrThrow({ where: { id: event.templateVersionId } });

    await tx.gallerySection.deleteMany({ where: { eventId } });
    await seedGalleryFromLayout(tx, eventId, version.layoutDefinition);
  });
}

export async function setCover(hostId: string, eventId: string, photoId: string | null) {
  await editableEvent(hostId, eventId);

  if (photoId !== null) {
    const ok = await prisma.photo.count({ where: { id: photoId, eventId, ...placeablePhoto } });
    if (!ok) throw HttpError.badRequest("The cover must be an approved, non-deleted photo of this event");
  }

  await prisma.event.update({ where: { id: eventId }, data: { coverPhotoId: photoId } });
  return { coverPhotoId: photoId };
}
