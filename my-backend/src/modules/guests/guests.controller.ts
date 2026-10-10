import type { CookieOptions } from "express";
import { env } from "../../config/env";
import { asyncHandler } from "../../lib/asyncHandler";
import { HttpError } from "../../lib/httpError";
import { getParam } from "../../lib/params";
import { hasPinAccess } from "../../lib/pin";
import { unlockWithPin } from "../../lib/pinUnlock";
import * as service from "./guests.service";

const GUEST_COOKIE_DAYS = 90;

const guestCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api",
  maxAge: GUEST_COOKIE_DAYS * 24 * 60 * 60 * 1000,
};

const readCookie = (cookies: Record<string, unknown> | undefined, name: string) => {
  const value = cookies?.[name];
  return typeof value === "string" && value.length > 0 ? value : null;
};

export const openSession = asyncHandler(async (req, res) => {
  // The cookie names depend on the event, which we only know after looking up the link.
  const link = await service.findLinkByToken(getParam(req, "token"));
  const cookieValue = readCookie(req.cookies, service.guestCookieName(link.eventId));
  const pinOk = await hasPinAccess(link.event, req.cookies);

  const session = await service.openSession(link, cookieValue, pinOk);

  if (session.newCookieValue) {
    res.cookie(service.guestCookieName(link.eventId), session.newCookieValue, guestCookieOptions);
  }

  res.json({ success: true, data: service.describeSession(session) });
});

// For events with a PIN: the guest types the 4-digit code from the invitation card.
export const unlock = asyncHandler(async (req, res) => {
  const link = await service.findLinkByToken(getParam(req, "token"));
  await unlockWithPin(req, res, link.event, req.body.pin);
  res.json({ success: true });
});

export const renameGuest = asyncHandler(async (req, res) => {
  const link = await service.findLinkByToken(getParam(req, "token"));
  if (!(await hasPinAccess(link.event, req.cookies))) throw new HttpError(403, "PIN required", { pinRequired: true });

  const cookieValue = readCookie(req.cookies, service.guestCookieName(link.eventId));
  const guest = await service.renameGuest(link, cookieValue, req.body.displayName);
  res.json({ success: true, data: { guest: { id: guest.id, displayName: guest.displayName } } });
});
