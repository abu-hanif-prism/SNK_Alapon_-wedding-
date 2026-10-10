import type { EventStatus, UserStatus } from "../../generated/prisma/enums";
import type { Prisma } from "../../generated/prisma/client";
import { audit } from "../../lib/audit";
import { HttpError } from "../../lib/httpError";
import { toSkipTake } from "../../lib/params";
import { prisma } from "../../lib/prisma";
import { listEventPhotos, moderatePhotos } from "../photos/photos.service";
import type { ListPhotosQuery, ModerateInput } from "../photos/photos.schema";
import { addMonths, computeEndsAt } from "../subscriptions/subscription-period";
import type { AuditLogsQuery, ListUsersQuery, SubscriptionActionInput } from "./admin.schema";

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- overview

export async function getStats() {
  const since = new Date(Date.now() - 30 * DAY_MS);

  const [hosts, newHosts, eventsByStatus, activeSubscriptions, pendingPayments, photos, storage, revenue, revenue30, recentPayments, recentEvents] =
    await Promise.all([
      prisma.user.count({ where: { role: "HOST" } }),
      prisma.user.count({ where: { role: "HOST", createdAt: { gte: since } } }),
      prisma.event.groupBy({ by: ["status"], _count: true }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.payment.count({ where: { status: "INITIATED", createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } } }),
      prisma.photo.count({ where: { deletedAt: null, OR: [{ uploadedByHostId: { not: null } }, { uploadBatch: { is: { status: "COMPLETED" } } }] } }),
      prisma.subscription.aggregate({ _sum: { usedBytes: true } }),
      prisma.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: "COMPLETED", paidAt: { gte: since } }, _sum: { amount: true } }),
      prisma.payment.findMany({
        where: { status: "COMPLETED" },
        orderBy: { paidAt: "desc" },
        take: 5,
        select: { id: true, amount: true, currency: true, paidAt: true, trxId: true, subscription: { select: { host: { select: { name: true, email: true } }, plan: { select: { name: true } } } } },
      }),
      prisma.event.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, slug: true, status: true, createdAt: true, host: { select: { name: true, email: true } } },
      }),
    ]);

  const events = Object.fromEntries(eventsByStatus.map((row) => [row.status, row._count]));

  return {
    hosts: { total: hosts, last30Days: newHosts },
    events: { DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0, ...events },
    subscriptions: { active: activeSubscriptions },
    payments: { stuckInitiated: pendingPayments },
    photos: { total: photos },
    storageUsedBytes: storage._sum.usedBytes ?? 0n,
    revenue: { total: revenue._sum.amount ?? "0", last30Days: revenue30._sum.amount ?? "0", currency: "BDT" },
    recentPayments,
    recentEvents,
  };
}

// ---------- hosts

export async function listUsers(query: ListUsersQuery) {
  const where: Prisma.UserWhereInput = {
    ...(query.role && { role: query.role }),
    ...(query.status && { status: query.status }),
    ...(query.q && {
      OR: [
        { name: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
        { phone: { contains: query.q } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query),
      select: {
        id: true, name: true, email: true, phone: true, phoneVerifiedAt: true, role: true, status: true, createdAt: true,
        _count: { select: { events: true, subscriptions: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page: query.page, limit: query.limit };
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, phone: true, phoneVerifiedAt: true, role: true, status: true, createdAt: true,
      subscriptions: {
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, edition: true, startsAt: true, endsAt: true, pricePaid: true, usedBytes: true, storageLimitBytes: true, plan: { select: { name: true, code: true } } },
      },
      events: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, slug: true, status: true, eventDate: true, photoCount: true },
      },
    },
  });
  if (!user) throw HttpError.notFound("User not found");
  return user;
}

export async function setUserStatus(adminId: string, id: string, status: UserStatus) {
  if (id === adminId) throw HttpError.conflict("You cannot change your own account status");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw HttpError.notFound("User not found");
  if (user.role === "ADMIN") throw HttpError.conflict("Administrator accounts cannot be suspended here");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { status } });
    // A suspended user is signed out everywhere (their short-lived access token expires on its own).
    if (status === "SUSPENDED") {
      await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await audit(adminId, `user.${status === "SUSPENDED" ? "suspend" : "activate"}`, "user", id, { email: user.email }, tx);
  });

  return getUser(id);
}

// ---------- events

export async function getEvent(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, name: true, email: true, phone: true } },
      subscription: { select: { id: true, status: true, endsAt: true, edition: true, plan: { select: { name: true } } } },
      templateVersion: { select: { version: true, edition: true, template: { select: { code: true, name: true } } } },
    },
  });
  if (!event) throw HttpError.notFound("Event not found");

  const byApproval = await prisma.photo.groupBy({
    by: ["approvalStatus"],
    where: { eventId: id, deletedAt: null, OR: [{ uploadedByHostId: { not: null } }, { uploadBatch: { is: { status: "COMPLETED" } } }] },
    _count: true,
  });

  return { ...event, photosByApproval: Object.fromEntries(byApproval.map((row) => [row.approvalStatus, row._count])) };
}

export async function setEventStatus(adminId: string, id: string, status: EventStatus) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw HttpError.notFound("Event not found");

  const now = new Date();
  await prisma.event.update({
    where: { id },
    data: {
      status,
      ...(status === "PUBLISHED" && { publishedAt: event.publishedAt ?? now, archivedAt: null }),
      ...(status === "DRAFT" && { publishedAt: null, archivedAt: null }),
      ...(status === "ARCHIVED" && { archivedAt: now }),
    },
  });
  await audit(adminId, "event.status", "event", id, { from: event.status, to: status });

  return getEvent(id);
}

async function requireEvent(id: string) {
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!event) throw HttpError.notFound("Event not found");
}

export async function listPhotos(eventId: string, query: ListPhotosQuery) {
  await requireEvent(eventId);
  return listEventPhotos(eventId, query);
}

// Admins can moderate any event, even an archived one.
export async function moderate(adminId: string, eventId: string, input: ModerateInput) {
  await requireEvent(eventId);
  const result = await moderatePhotos(adminId, eventId, input);
  await audit(adminId, "photo.moderate", "event", eventId, { action: input.action, photos: input.photoIds.length, reason: input.reason ?? null });
  return result;
}

// ---------- subscriptions

export async function subscriptionAction(adminId: string, id: string, input: SubscriptionActionInput) {
  const subscription = await prisma.subscription.findUnique({ where: { id }, include: { plan: true } });
  if (!subscription) throw HttpError.notFound("Subscription not found");

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    switch (input.action) {
      case "activate": {
        if (subscription.status !== "PENDING_PAYMENT") throw HttpError.conflict("Only a subscription awaiting payment can be activated");
        await tx.subscription.update({
          where: { id },
          data: { status: "ACTIVE", startsAt: now, endsAt: computeEndsAt(now, subscription.plan.billingPeriod, subscription.plan.durationMonths) },
        });
        break;
      }
      case "cancel": {
        if (subscription.status === "CANCELED") throw HttpError.conflict("This subscription is already canceled");
        await tx.subscription.update({ where: { id }, data: { status: "CANCELED", endsAt: subscription.endsAt && subscription.endsAt < now ? subscription.endsAt : now } });
        await tx.event.updateMany({
          where: { subscriptionId: id, status: { in: ["DRAFT", "PUBLISHED"] } },
          data: { status: "ARCHIVED", archivedAt: now },
        });
        break;
      }
      case "extend": {
        if (subscription.status !== "ACTIVE" && subscription.status !== "EXPIRED") {
          throw HttpError.conflict("Only an active or expired subscription can be extended");
        }
        const from = subscription.endsAt && subscription.endsAt > now ? subscription.endsAt : now;
        await tx.subscription.update({ where: { id }, data: { status: "ACTIVE", endsAt: addMonths(from, input.months) } });

        // Events archived because it ran out come back.
        const archived = await tx.event.findMany({ where: { subscriptionId: id, status: "ARCHIVED" }, select: { id: true, publishedAt: true } });
        for (const event of archived) {
          await tx.event.update({ where: { id: event.id }, data: { status: event.publishedAt ? "PUBLISHED" : "DRAFT", archivedAt: null } });
        }
        break;
      }
    }

    await audit(adminId, `subscription.${input.action}`, "subscription", id, input.action === "extend" ? { months: input.months } : {}, tx);
  });

  return prisma.subscription.findUniqueOrThrow({ where: { id }, include: { plan: { select: { id: true, code: true, name: true } } } });
}

// ---------- audit log

export async function listAuditLogs(query: AuditLogsQuery) {
  const where: Prisma.AuditLogWhereInput = {
    ...(query.entityType && { entityType: query.entityType }),
    ...(query.actorId && { actorId: query.actorId }),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query),
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page: query.page, limit: query.limit };
}
