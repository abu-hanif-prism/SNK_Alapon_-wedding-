import type { Event, Guest, UploadLink } from "../../generated/prisma/client";
import { HttpError } from "../../lib/httpError";
import { prisma } from "../../lib/prisma";
import { generateOpaqueToken, hashToken } from "../../lib/tokens";
import { isSubscriptionUsable } from "../events/events.service";
import { linkState } from "../upload-links/link-state";

// A guest keeps one cookie per event, so attending several events doesn't mix them up.
export const guestCookieName = (eventId: string) => `guest_${eventId}`;

export type UploadState = "not_open_yet" | "open" | "closed";
export type SessionState = UploadState | "pin_required";

export type LinkWithEvent = UploadLink & {
  event: Event & { subscription: { status: string; endsAt: Date | null } };
};

export async function findLinkByToken(rawToken: string): Promise<LinkWithEvent> {
  const link = await prisma.uploadLink.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { event: { include: { subscription: { select: { status: true, endsAt: true } } } } },
  });

  // Same answer for unknown and revoked links, so tokens can't be probed.
  if (!link || link.revokedAt) throw HttpError.notFound("This upload link is not valid");
  return link;
}

// Uploads are accepted only while the link's window is open, the event is published
// and the host's subscription is still active.
export function sessionState(link: LinkWithEvent, now = new Date()): UploadState {
  if (link.event.status !== "PUBLISHED" || !isSubscriptionUsable(link.event.subscription)) return "closed";

  const state = linkState(link, now);
  if (state === "scheduled") return "not_open_yet";
  return state === "open" ? "open" : "closed";
}

export async function findGuest(eventId: string, cookieValue: string | null): Promise<Guest | null> {
  if (!cookieValue) return null;
  return prisma.guest.findFirst({ where: { eventId, cookieTokenHash: hashToken(cookieValue) } });
}

export type Session = {
  link: LinkWithEvent;
  state: SessionState;
  guest: Guest | null;
  // Set only when a brand-new guest was created; the controller sends it as a cookie.
  newCookieValue: string | null;
};

// Opens (or resumes) a guest session. A new Guest row is created only while uploads are open,
// so scanning the QR before the event does not create records. If the event has a PIN that the visitor
// has not entered yet, nothing is created and the state is "pin_required".
export async function openSession(link: LinkWithEvent, cookieValue: string | null, pinOk: boolean): Promise<Session> {
  if (!pinOk) return { link, state: "pin_required", guest: null, newCookieValue: null };

  const state = sessionState(link);

  let guest = await findGuest(link.eventId, cookieValue);

  if (guest) {
    guest = await prisma.guest.update({ where: { id: guest.id }, data: { lastSeenAt: new Date() } });
    return { link, state, guest, newCookieValue: null };
  }

  if (state !== "open") return { link, state, guest: null, newCookieValue: null };

  const newCookieValue = generateOpaqueToken();
  guest = await prisma.guest.create({
    data: { eventId: link.eventId, cookieTokenHash: hashToken(newCookieValue) },
  });

  return { link, state, guest, newCookieValue };
}

export async function renameGuest(link: LinkWithEvent, cookieValue: string | null, displayName: string | null) {
  const guest = await findGuest(link.eventId, cookieValue);
  if (!guest) throw HttpError.unauthorized("Open the upload link first");

  return prisma.guest.update({ where: { id: guest.id }, data: { displayName } });
}

export function describeSession(session: Session) {
  const { link, state, guest } = session;
  const { event } = link;

  return {
    state,
    event: {
      title: event.title,
      coupleNames: event.coupleNames,
      location: event.location,
      venue: event.venue,
      eventDate: event.eventDate,
      slug: event.slug,
      welcomeMessage: event.welcomeMessage,
    },
    // Only revealed once any PIN has been entered.
    settings:
      state === "pin_required"
        ? null
        : {
            pinProtected: event.accessPin !== null,
            requireGuestName: event.requireGuestName,
            allowGuestNotes: event.allowGuestNotes,
            approvalRequired: event.approvalRequired,
            perGuestUploadLimit: event.perGuestUploadLimit,
          },
    pinRequired: state === "pin_required",
    window: { opensAt: link.opensAt, closesAt: link.closesAt },
    guest: guest && {
      id: guest.id,
      displayName: guest.displayName,
      uploadedCount: guest.uploadedCount,
      remainingUploads: Math.max(0, event.perGuestUploadLimit - guest.uploadedCount),
    },
    // null = no cap on the whole event
    eventRemainingUploads:
      event.eventUploadLimit === null ? null : Math.max(0, event.eventUploadLimit - event.photoCount),
  };
}
