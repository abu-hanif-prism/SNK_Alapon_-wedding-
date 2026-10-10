import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { toJson } from "../../lib/json";

export const MAX_SECTIONS_PER_EVENT = 60;
export const MAX_BLOCKS_PER_EVENT = 300;

// Positions are unique per parent, so reordering is done in two phases: first push every row far
// out of the way, then write the final 0..n-1 numbers. (Updating one by one would collide.)
const SHIFT = 100_000;
// Parking spot for a row that is being inserted or moved before the renumbering assigns its place.
export const PARKING_POSITION = 2_000_000;

// Serialises layout edits for one event, so two editors can't corrupt the ordering.
export async function lockEvent(tx: Prisma.TransactionClient, eventId: string) {
  await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId}::uuid FOR UPDATE`;
}

export async function renumberSections(tx: Prisma.TransactionClient, eventId: string, orderedIds: string[]) {
  await tx.gallerySection.updateMany({ where: { eventId }, data: { position: { increment: SHIFT } } });
  for (const [position, id] of orderedIds.entries()) {
    await tx.gallerySection.update({ where: { id }, data: { position } });
  }
}

export async function renumberBlocks(tx: Prisma.TransactionClient, sectionId: string, orderedIds: string[]) {
  await tx.galleryBlock.updateMany({ where: { sectionId }, data: { position: { increment: SHIFT } } });
  for (const [position, id] of orderedIds.entries()) {
    await tx.galleryBlock.update({ where: { id }, data: { position } });
  }
}

export const insertAt = <T>(list: T[], item: T, position: number | undefined): T[] => {
  const index = position === undefined ? list.length : Math.min(Math.max(position, 0), list.length);
  return [...list.slice(0, index), item, ...list.slice(index)];
};

// --- starting layout from a template version

const layoutSchema = z.object({
  sections: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        subtitle: z.string().max(200).optional(),
        blocks: z.array(z.object({ blockType: z.string(), photos: z.number().int().min(1).max(6).optional() })).max(100),
      }),
    )
    .max(MAX_SECTIONS_PER_EVENT),
});

// Creates the empty chapters and blocks described by a template's layoutDefinition.
// Blocks reference block types by code; unknown codes are skipped rather than failing the event.
export async function seedGalleryFromLayout(tx: Prisma.TransactionClient, eventId: string, layoutDefinition: unknown) {
  const parsed = layoutSchema.safeParse(layoutDefinition);
  if (!parsed.success) {
    console.error("Template layoutDefinition is not valid, gallery left empty:", parsed.error.issues);
    return;
  }

  const codes = [...new Set(parsed.data.sections.flatMap((section) => section.blocks.map((block) => block.blockType)))];
  const blockTypes = await tx.blockType.findMany({ where: { code: { in: codes } } });
  const byCode = new Map(blockTypes.map((blockType) => [blockType.code, blockType]));

  for (const [sectionIndex, section] of parsed.data.sections.entries()) {
    const created = await tx.gallerySection.create({
      data: { eventId, title: section.title, subtitle: section.subtitle ?? null, position: sectionIndex },
    });

    const blocks = section.blocks.flatMap((block) => {
      const blockType = byCode.get(block.blockType);
      if (!blockType) {
        console.error(`Template references unknown block type "${block.blockType}"`);
        return [];
      }
      const planned = Math.min(Math.max(block.photos ?? blockType.minPhotos, blockType.minPhotos), blockType.maxPhotos);
      return [{ blockTypeId: blockType.id, settings: toJson({ plannedPhotos: planned }) }];
    });

    if (blocks.length > 0) {
      await tx.galleryBlock.createMany({
        data: blocks.map((block, position) => ({ sectionId: created.id, position, ...block })),
      });
    }
  }
}
