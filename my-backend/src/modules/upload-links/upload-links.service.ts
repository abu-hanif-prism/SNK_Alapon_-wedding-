import QRCode from "qrcode";
import { env } from "../../config/env";
import type { Event } from "../../generated/prisma/client";
import { HttpError } from "../../lib/httpError";
import { prisma } from "../../lib/prisma";
import { decryptSecret, encryptSecret } from "../../lib/secretBox";
import { generateOpaqueToken, hashToken } from "../../lib/tokens";
import { zonedTimeToUtc } from "../../lib/timezone";
import { assertEditable, getOwnedEvent } from "../events/events.service";
import { linkState } from "./link-state";
import type { CreateUploadLinkInput, UpdateUploadLinkInput } from "./upload-links.schema";

// A wedding is planned months ahead and the QR is printed early, so a window may be long.
const MAX_WINDOW_MS = 400 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const buildUploadUrl = (rawToken: string) => new URL(`/u/${rawToken}`, env.FRONTEND_URL).toString();
export const buildWebsiteUrl = (slug: string) => new URL(`/${slug}`, env.FRONTEND_URL).toString();

const dayParts = (eventDate: Date) => ({
  year: eventDate.getUTCFullYear(),
  month: eventDate.getUTCMonth() + 1,
  day: eventDate.getUTCDate(),
});

// Event day 00:00 until the end of the following day, in the event's own time zone.
function defaultWindow(eventDate: Date, timezone: string) {
  const { year, month, day } = dayParts(eventDate);
  return {
    opensAt: zonedTimeToUtc(year, month, day, 0, 0, 0, timezone),
    closesAt: zonedTimeToUtc(year, month, day + 1, 23, 59, 59, timezone),
  };
}

// The link printed on the QR cards. It opens right away (so the host can test uploads after paying)
// and stays open until three days after the wedding.
function primaryWindow(event: Pick<Event, "eventDate" | "timezone">) {
  const { year, month, day } = dayParts(event.eventDate);
  const now = new Date();
  const wanted = zonedTimeToUtc(year, month, day + 3, 23, 59, 59, event.timezone);

  return { opensAt: now, closesAt: wanted.getTime() > now.getTime() + DAY_MS ? wanted : new Date(now.getTime() + 7 * DAY_MS) };
}

function assertWindow(opensAt: Date, closesAt: Date) {
  if (closesAt <= opensAt) throw HttpError.badRequest("closesAt must be after opensAt");
  if (closesAt.getTime() - opensAt.getTime() > MAX_WINDOW_MS) {
    throw HttpError.badRequest("An upload window can last at most 400 days");
  }
  if (closesAt <= new Date()) throw HttpError.badRequest("closesAt must be in the future");
}

// The raw token is encrypted so the host can be shown the link and QR again later; the hash is what guests
// are looked up by.
async function insertLink(eventId: string, opensAt: Date, closesAt: Date) {
  const rawToken = generateOpaqueToken();
  const link = await prisma.uploadLink.create({
    data: { eventId, tokenHash: hashToken(rawToken), tokenEnc: encryptSecret(rawToken), opensAt, closesAt },
  });
  return { link, rawToken };
}

const qrFor = (url: string) => QRCode.toDataURL(url, { margin: 2, width: 512 });

export async function createUploadLink(hostId: string, eventId: string, input: CreateUploadLinkInput) {
  const event = await getOwnedEvent(hostId, eventId);
  assertEditable(event);

  const defaults = defaultWindow(event.eventDate, event.timezone);
  const opensAt = input.opensAt ?? defaults.opensAt;
  const closesAt = input.closesAt ?? defaults.closesAt;
  assertWindow(opensAt, closesAt);

  const { link, rawToken } = await insertLink(eventId, opensAt, closesAt);
  const url = buildUploadUrl(rawToken);

  return {
    link: { id: link.id, eventId, opensAt, closesAt, revokedAt: null, state: linkState(link) },
    url,
    qrCodeDataUrl: await qrFor(url),
  };
}

// The newest working link, created on demand. Called when an event is published.
export async function ensurePrimaryLink(event: Event) {
  const existing = await prisma.uploadLink.findFirst({
    where: { eventId: event.id, revokedAt: null, tokenEnc: { not: null }, closesAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  const { opensAt, closesAt } = primaryWindow(event);
  return (await insertLink(event.id, opensAt, closesAt)).link;
}

// Everything the "Invite your guests" / "Share" screens need, for the event's current link.
export async function getShare(hostId: string, eventId: string) {
  const event = await getOwnedEvent(hostId, eventId);
  const link = event.status === "ARCHIVED" ? null : await ensurePrimaryLink(event);

  const rawToken = link?.tokenEnc ? decryptSecret(link.tokenEnc) : null;
  const uploadUrl = rawToken ? buildUploadUrl(rawToken) : null;

  return {
    websiteUrl: buildWebsiteUrl(event.slug),
    uploadUrl,
    qrCodeDataUrl: uploadUrl ? await qrFor(uploadUrl) : null,
    link: link && { id: link.id, opensAt: link.opensAt, closesAt: link.closesAt, state: linkState(link) },
    pin: event.accessPin,
    shareText: uploadUrl
      ? `Help us capture the love! We've set up a private digital photo album to collect your memories of our big day. No app downloads needed - just scan our QR code or click: ${uploadUrl}`
      : null,
  };
}

export async function listUploadLinks(hostId: string, eventId: string) {
  await getOwnedEvent(hostId, eventId);

  const links = await prisma.uploadLink.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    select: { id: true, opensAt: true, closesAt: true, revokedAt: true, createdAt: true },
  });

  return links.map((link) => ({ ...link, state: linkState(link) }));
}

export async function updateUploadLink(hostId: string, eventId: string, linkId: string, input: UpdateUploadLinkInput) {
  const event = await getOwnedEvent(hostId, eventId);
  assertEditable(event);

  const link = await prisma.uploadLink.findFirst({ where: { id: linkId, eventId } });
  if (!link) throw HttpError.notFound("Upload link not found");
  if (link.revokedAt) throw HttpError.conflict("This link was revoked");

  const opensAt = input.opensAt ?? link.opensAt;
  const closesAt = input.closesAt ?? link.closesAt;
  assertWindow(opensAt, closesAt);

  const updated = await prisma.uploadLink.update({ where: { id: linkId }, data: { opensAt, closesAt } });
  return { id: updated.id, opensAt: updated.opensAt, closesAt: updated.closesAt, state: linkState(updated) };
}

export async function revokeUploadLink(hostId: string, eventId: string, linkId: string) {
  await getOwnedEvent(hostId, eventId);

  const link = await prisma.uploadLink.findFirst({ where: { id: linkId, eventId } });
  if (!link) throw HttpError.notFound("Upload link not found");

  if (!link.revokedAt) {
    await prisma.uploadLink.updateMany({ where: { id: linkId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
