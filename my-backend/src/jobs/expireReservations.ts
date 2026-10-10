import { prisma } from "../lib/prisma";
import { storage } from "../lib/storage";

// Guest batches that never finished uploading hold quota until they expire. This releases them:
// the batch becomes EXPIRED and its (never confirmed) photo rows and stray files are removed.
export async function expireReservations(): Promise<number> {
  const stale = await prisma.uploadBatch.findMany({
    where: { status: "RESERVED", expiresAt: { lt: new Date() } },
    select: { id: true },
    take: 100,
  });

  let expired = 0;

  for (const { id } of stale) {
    const keys = await prisma.$transaction(async (tx) => {
      // Loses the race harmlessly if the guest completed the batch a moment ago.
      const claimed = await tx.uploadBatch.updateMany({
        where: { id, status: "RESERVED", expiresAt: { lt: new Date() } },
        data: { status: "EXPIRED" },
      });
      if (claimed.count === 0) return null;

      const photos = await tx.photo.findMany({ where: { uploadBatchId: id }, select: { originalObjectKey: true } });
      await tx.photo.deleteMany({ where: { uploadBatchId: id } });
      return photos.map((photo) => photo.originalObjectKey);
    });

    if (keys === null) continue;
    expired++;

    await Promise.all(
      keys.map((key) =>
        storage.deleteObject(key).catch((error) => console.error(`Could not delete orphan object ${key}:`, error)),
      ),
    );
  }

  return expired;
}
