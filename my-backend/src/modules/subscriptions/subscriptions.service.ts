import type { Prisma } from "../../generated/prisma/client";
import { HttpError } from "../../lib/httpError";
import { toSkipTake } from "../../lib/params";
import { prisma } from "../../lib/prisma";
import { computeEndsAt } from "./subscription-period";
import type { AdminListSubscriptionsQuery } from "./subscriptions.schema";

const withPlan = { plan: { select: { id: true, code: true, name: true, billingPeriod: true } } } as const;

// Creates (or refreshes) the PENDING_PAYMENT subscription for a plan.
// Limits and price are copied from the plan now, so later plan edits don't change what the host bought.
export async function createForHost(hostId: string, planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) throw HttpError.notFound("Plan not found");

  const snapshot = {
    edition: plan.edition,
    maxEvents: plan.maxEvents,
    storageLimitBytes: plan.storageLimitBytes,
    pricePaid: plan.price,
  };

  const pending = await prisma.subscription.findFirst({
    where: { hostId, planId, status: "PENDING_PAYMENT" },
  });

  if (pending) {
    return prisma.subscription.update({ where: { id: pending.id }, data: snapshot, include: withPlan });
  }

  return prisma.subscription.create({ data: { hostId, planId, ...snapshot }, include: withPlan });
}

export const listForHost = (hostId: string) =>
  prisma.subscription.findMany({
    where: { hostId },
    orderBy: { createdAt: "desc" },
    include: withPlan,
  });

export async function getForHost(hostId: string, id: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { id, hostId },
    include: { ...withPlan, payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!subscription) throw HttpError.notFound("Subscription not found");
  return subscription;
}

export async function listForAdmin(query: AdminListSubscriptionsQuery) {
  const where: Prisma.SubscriptionWhereInput = query.status ? { status: query.status } : {};

  const [items, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query),
      include: { ...withPlan, host: { select: { id: true, name: true, email: true } } },
    }),
    prisma.subscription.count({ where }),
  ]);

  return { items, total, page: query.page, limit: query.limit };
}

// Called inside the payment-completion transaction. No-op unless still PENDING_PAYMENT.
export async function activateSubscription(tx: Prisma.TransactionClient, subscriptionId: string) {
  const subscription = await tx.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: { select: { billingPeriod: true, durationMonths: true } } },
  });
  if (!subscription || subscription.status !== "PENDING_PAYMENT") return;

  const startsAt = new Date();

  await tx.subscription.updateMany({
    where: { id: subscriptionId, status: "PENDING_PAYMENT" },
    data: {
      status: "ACTIVE",
      startsAt,
      endsAt: computeEndsAt(startsAt, subscription.plan.billingPeriod, subscription.plan.durationMonths),
    },
  });
}
