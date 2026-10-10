import { prisma } from "../lib/prisma";

// When a subscription runs out it becomes EXPIRED and all its events are ARCHIVED:
// read-only (no uploads, no edits) but still publicly visible. Safe to run any number of times.
export async function expireSubscriptions(): Promise<{ subscriptions: number; events: number }> {
  const now = new Date();

  const due = await prisma.subscription.findMany({
    where: { status: "ACTIVE", endsAt: { lt: now } },
    select: { id: true },
    take: 200,
  });

  let subscriptions = 0;
  let events = 0;

  for (const { id } of due) {
    await prisma.$transaction(async (tx) => {
      // Only one runner can flip ACTIVE -> EXPIRED, so events are archived once.
      const claimed = await tx.subscription.updateMany({
        where: { id, status: "ACTIVE", endsAt: { lt: now } },
        data: { status: "EXPIRED" },
      });
      if (claimed.count === 0) return;

      const archived = await tx.event.updateMany({
        where: { subscriptionId: id, status: { in: ["DRAFT", "PUBLISHED"] } },
        data: { status: "ARCHIVED", archivedAt: now },
      });

      subscriptions++;
      events += archived.count;
    });
  }

  return { subscriptions, events };
}
