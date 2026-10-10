import type { Prisma } from "../../generated/prisma/client";
import { HttpError } from "../../lib/httpError";

// Locks the subscription row for the rest of the transaction, so quota checks and the writes that
// follow them can't interleave with another upload. Every upload/complete path takes this lock.
export async function lockSubscription(tx: Prisma.TransactionClient, subscriptionId: string) {
  await tx.$queryRaw`SELECT id FROM subscriptions WHERE id = ${subscriptionId}::uuid FOR UPDATE`;
}

// Reservations that still hold quota: batches waiting for their files and not yet expired.
export const activeReservation = () => ({ status: "RESERVED", expiresAt: { gt: new Date() } }) as const;

export async function reservedForSubscription(tx: Prisma.TransactionClient, subscriptionId: string) {
  const result = await tx.uploadBatch.aggregate({
    where: { ...activeReservation(), event: { subscriptionId } },
    _sum: { reservedBytes: true, reservedPhotoCount: true },
  });
  return { bytes: result._sum.reservedBytes ?? 0n, photos: result._sum.reservedPhotoCount ?? 0 };
}

// Throws unless `additionalBytes` still fit in the subscription's storage (counting reservations).
export async function assertStorageAvailable(
  tx: Prisma.TransactionClient,
  subscriptionId: string,
  additionalBytes: bigint,
) {
  const subscription = await tx.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });
  const reserved = await reservedForSubscription(tx, subscriptionId);

  if (subscription.usedBytes + reserved.bytes + additionalBytes > subscription.storageLimitBytes) {
    throw HttpError.conflict("Storage limit reached for this subscription");
  }
}
