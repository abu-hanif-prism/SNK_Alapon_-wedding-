import type { Event, Prisma } from "../../generated/prisma/client";
import { compact } from "../../lib/compact";
import { HttpError } from "../../lib/httpError";
import { isUniqueViolation, toNullableJson } from "../../lib/json";
import { toSkipTake } from "../../lib/params";
import { prisma } from "../../lib/prisma";
import { isReservedSlug, SLUG_PATTERN, slugify, withRandomSuffix } from "../../lib/slug";
import { lockEvent, seedGalleryFromLayout } from "../gallery/gallery.layout";
import type { AdminListEventsQuery, CreateEventInput, UpdateEventInput } from "./events.schema";

export const isSubscriptionUsable = (subscription: { status: string; endsAt: Date | null }) =>
  subscription.status === "ACTIVE" && (subscription.endsAt === null || subscription.endsAt > new Date());

// The host's own event, or 404 (never reveal that someone else's event exists).
export async function getOwnedEvent(hostId: string, eventId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId, hostId } });
  if (!event) throw HttpError.notFound("Event not found");
  return event;
}

// Archived events are read-only.
export function assertEditable(event: Pick<Event, "status">) {
  if (event.status === "ARCHIVED") throw HttpError.conflict("This event is archived and read-only");
}

async function assertTemplateVersionFits(templateVersionId: string, edition: number) {
  const version = await prisma.templateVersion.findUnique({
    where: { id: templateVersionId },
    include: { template: { select: { isActive: true } } },
  });

  if (!version || !version.template.isActive) throw HttpError.badRequest("Template version not found");
  if (version.edition !== edition) {
    throw HttpError.badRequest(`This template version is for the ${version.edition}-photo edition, not ${edition}`);
  }
  return version;
}

async function pickFreeSlug(base: string) {
  const candidates = [base, ...Array.from({ length: 4 }, () => withRandomSuffix(base))];

  for (const candidate of candidates) {
    if (!isReservedSlug(candidate) && !(await prisma.event.findUnique({ where: { slug: candidate } }))) {
      return candidate;
    }
  }
  return withRandomSuffix(withRandomSuffix(base));
}

// Powers the "Choose your address" step: is the slug usable, and what else could they pick?
export async function checkSlug(slug: string, city?: string) {
  const validShape = slug.length >= 3 && slug.length <= 60 && SLUG_PATTERN.test(slug);
  const taken = validShape && !isReservedSlug(slug) ? await prisma.event.findUnique({ where: { slug }, select: { id: true } }) : null;

  const reason = !validShape ? "invalid" : isReservedSlug(slug) ? "reserved" : taken ? "taken" : null;

  const base = validShape ? slug.slice(0, 44) : slugify(slug);
  const candidates = [
    `${base}${new Date().getUTCFullYear()}`,
    ...(city ? [`${base}-${slugify(city)}`] : []),
    `${base}-wedding`,
  ].filter((candidate, index, all) => SLUG_PATTERN.test(candidate) && candidate.length <= 60 && all.indexOf(candidate) === index);

  const used = await prisma.event.findMany({ where: { slug: { in: candidates } }, select: { slug: true } });
  const usedSet = new Set(used.map((event) => event.slug));

  return {
    slug,
    available: reason === null,
    reason,
    suggestions: candidates.filter((candidate) => !usedSet.has(candidate) && !isReservedSlug(candidate) && candidate !== slug),
  };
}

export async function createEvent(hostId: string, input: CreateEventInput) {
  const subscription = await prisma.subscription.findFirst({ where: { id: input.subscriptionId, hostId } });
  if (!subscription) throw HttpError.notFound("Subscription not found");

  // A host can set everything up before paying: the event stays a draft until the subscription is active.
  const awaitingPayment = subscription.status === "PENDING_PAYMENT";
  if (!awaitingPayment && !isSubscriptionUsable(subscription)) throw HttpError.conflict("This subscription is not active");

  const templateVersion = await assertTemplateVersionFits(input.templateVersionId, subscription.edition);

  const slug = input.slug ?? (await pickFreeSlug(slugify(input.coupleNames)));

  try {
    return await prisma.$transaction(async (tx) => {
      // Lock the subscription row so two simultaneous requests can't both pass the maxEvents check.
      await tx.$queryRaw`SELECT id FROM subscriptions WHERE id = ${subscription.id}::uuid FOR UPDATE`;

      const used = await tx.event.count({ where: { subscriptionId: subscription.id } });
      if (used >= subscription.maxEvents) {
        throw HttpError.conflict(`Event limit reached (${subscription.maxEvents}) for this subscription`);
      }

      const created = await tx.event.create({
        data: {
          hostId,
          subscriptionId: subscription.id,
          templateVersionId: input.templateVersionId,
          slug,
          title: input.title,
          coupleNames: input.coupleNames,
          brideName: input.brideName ?? null,
          groomName: input.groomName ?? null,
          location: input.location,
          venue: input.venue ?? null,
          eventDate: input.eventDate,
          timezone: input.timezone,
          welcomeMessage: input.welcomeMessage ?? null,
          edition: subscription.edition,
          approvalRequired: input.approvalRequired,
          allowViewerDownload: input.allowViewerDownload,
          requireGuestName: input.requireGuestName,
          allowGuestNotes: input.allowGuestNotes,
          accessPin: input.accessPin ?? null,
          perGuestUploadLimit: input.perGuestUploadLimit,
          eventUploadLimit: input.eventUploadLimit ?? null,
          ...(input.content !== undefined && { content: toNullableJson(input.content) }),
          ...(input.themeOverrides !== undefined && { themeOverrides: toNullableJson(input.themeOverrides) }),
        },
      });

      // Start the gallery with the empty chapters and blocks the template describes.
      await seedGalleryFromLayout(tx, created.id, templateVersion.layoutDefinition);
      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw HttpError.conflict("This slug is already taken");
    throw error;
  }
}

export const listForHost = (hostId: string) =>
  prisma.event.findMany({ where: { hostId }, orderBy: { createdAt: "desc" } });

export const getForHost = (hostId: string, eventId: string) => getOwnedEvent(hostId, eventId);

export async function updateEvent(hostId: string, eventId: string, input: UpdateEventInput) {
  const event = await getOwnedEvent(hostId, eventId);
  assertEditable(event);

  const { slug, templateVersionId, themeOverrides, content, ...rest } = input;

  if ((slug !== undefined || templateVersionId !== undefined) && event.status !== "DRAFT") {
    throw HttpError.conflict("The slug and template can only be changed while the event is a draft");
  }
  const newVersion =
    templateVersionId !== undefined && templateVersionId !== event.templateVersionId
      ? await assertTemplateVersionFits(templateVersionId, event.edition)
      : null;
  if (slug !== undefined && slug !== event.slug && isReservedSlug(slug)) throw HttpError.badRequest("This slug is reserved");

  const data: Prisma.EventUncheckedUpdateInput = {
    ...compact(rest),
    ...(slug !== undefined && { slug }),
    ...(templateVersionId !== undefined && { templateVersionId }),
    ...(themeOverrides !== undefined && { themeOverrides: toNullableJson(themeOverrides) }),
    ...(content !== undefined && { content: toNullableJson(content) }),
  };

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.event.update({ where: { id: eventId }, data });

      // A different template starts a different layout, but only while the host has not placed any
      // photos yet; once they have, their arrangement is kept (use reset-to-template to start over).
      if (newVersion) {
        await lockEvent(tx, eventId);
        const placed = await tx.photoPlacement.count({ where: { block: { section: { eventId } } } });
        if (placed === 0) {
          await tx.gallerySection.deleteMany({ where: { eventId } });
          await seedGalleryFromLayout(tx, eventId, newVersion.layoutDefinition);
        }
      }
      return updated;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw HttpError.conflict("This slug is already taken");
    throw error;
  }
}

export async function publishEvent(hostId: string, eventId: string) {
  const event = await getOwnedEvent(hostId, eventId);
  if (event.status !== "DRAFT") throw HttpError.conflict("Only a draft event can be published");

  const subscription = await prisma.subscription.findUniqueOrThrow({ where: { id: event.subscriptionId } });
  if (!isSubscriptionUsable(subscription)) throw HttpError.conflict("This subscription is not active");

  // updateMany keeps this safe if two publish requests arrive together.
  const result = await prisma.event.updateMany({
    where: { id: eventId, status: "DRAFT" },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  if (result.count === 0) throw HttpError.conflict("Only a draft event can be published");

  return getOwnedEvent(hostId, eventId);
}

// "Hidden" in the dashboard. publishedAt is cleared so that, if the subscription later expires and
// the event is archived, it does not suddenly become public again against the host's wish.
export async function unpublishEvent(hostId: string, eventId: string) {
  const event = await getOwnedEvent(hostId, eventId);
  if (event.status !== "PUBLISHED") throw HttpError.conflict("Only a published event can be hidden");

  await prisma.event.updateMany({ where: { id: eventId, status: "PUBLISHED" }, data: { status: "DRAFT", publishedAt: null } });
  return getOwnedEvent(hostId, eventId);
}

// Moves an event to a bigger package the host already paid for (the "Upgrade Package" button).
// Photos and layout stay; the event switches to the same template's version for the new edition.
export async function upgradeEvent(hostId: string, eventId: string, newSubscriptionId: string) {
  const event = await getOwnedEvent(hostId, eventId);
  assertEditable(event);
  if (newSubscriptionId === event.subscriptionId) throw HttpError.badRequest("The event is already on this package");

  const target = await prisma.subscription.findFirst({ where: { id: newSubscriptionId, hostId } });
  if (!target) throw HttpError.notFound("Subscription not found");
  if (!isSubscriptionUsable(target)) throw HttpError.conflict("That package is not active");
  if (target.edition <= event.edition) {
    throw HttpError.badRequest(`Choose a package with more than ${event.edition} photos`);
  }

  const current = await prisma.templateVersion.findUniqueOrThrow({ where: { id: event.templateVersionId } });
  const newVersion = await prisma.templateVersion.findFirst({
    where: { templateId: current.templateId, edition: target.edition },
    orderBy: { version: "desc" },
  });
  if (!newVersion) throw HttpError.conflict("This template is not available for that package yet");

  return prisma.$transaction(async (tx) => {
    // Lock both subscriptions in a fixed order so two upgrades can't deadlock each other.
    for (const id of [event.subscriptionId, target.id].sort()) {
      await tx.$queryRaw`SELECT id FROM subscriptions WHERE id = ${id}::uuid FOR UPDATE`;
    }

    const [fresh, newSub] = await Promise.all([
      tx.event.findUniqueOrThrow({ where: { id: eventId } }),
      tx.subscription.findUniqueOrThrow({ where: { id: target.id } }),
    ]);

    if ((await tx.event.count({ where: { subscriptionId: newSub.id } })) >= newSub.maxEvents) {
      throw HttpError.conflict("That package has no free event slot");
    }
    if (newSub.usedBytes + fresh.usedBytes > newSub.storageLimitBytes) {
      throw HttpError.conflict("That package does not have enough storage for this event's photos");
    }

    await tx.subscription.update({ where: { id: fresh.subscriptionId }, data: { usedBytes: { decrement: fresh.usedBytes } } });
    await tx.subscription.update({ where: { id: newSub.id }, data: { usedBytes: { increment: fresh.usedBytes } } });

    return tx.event.update({
      where: { id: eventId },
      data: { subscriptionId: newSub.id, edition: newSub.edition, templateVersionId: newVersion.id },
    });
  });
}

export async function listForAdmin(query: AdminListEventsQuery) {
  const where: Prisma.EventWhereInput = {
    ...(query.status && { status: query.status }),
    ...(query.q && {
      OR: [
        { title: { contains: query.q, mode: "insensitive" } },
        { coupleNames: { contains: query.q, mode: "insensitive" } },
        { slug: { contains: query.q, mode: "insensitive" } },
        { host: { is: { email: { contains: query.q, mode: "insensitive" } } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query),
      include: { host: { select: { id: true, name: true, email: true } } },
    }),
    prisma.event.count({ where }),
  ]);

  return { items, total, page: query.page, limit: query.limit };
}
