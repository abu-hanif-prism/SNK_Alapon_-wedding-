import { asyncHandler } from "../../lib/asyncHandler";
import { HttpError } from "../../lib/httpError";
import { getParam } from "../../lib/params";
import { hasPinAccess } from "../../lib/pin";
import { findLinkByToken, guestCookieName } from "../guests/guests.service";
import * as guestUploads from "./uploads.guest.service";
import * as hostUploads from "./uploads.host.service";

// The guest cookie name depends on the event, which is only known after looking up the link.
async function resolveGuestRequest(token: string, cookies: Record<string, unknown> | undefined) {
  const link = await findLinkByToken(token);
  if (!(await hasPinAccess(link.event, cookies))) throw new HttpError(403, "PIN required", { pinRequired: true });
  const value = cookies?.[guestCookieName(link.eventId)];
  return { link, cookieValue: typeof value === "string" && value.length > 0 ? value : null };
}

export const reserveBatch = asyncHandler(async (req, res) => {
  const { link, cookieValue } = await resolveGuestRequest(getParam(req, "token"), req.cookies);
  const result = await guestUploads.reserveBatch(link, cookieValue, req.body);
  res.status(201).json({ success: true, data: result });
});

export const completeBatch = asyncHandler(async (req, res) => {
  const { link, cookieValue } = await resolveGuestRequest(getParam(req, "token"), req.cookies);
  const result = await guestUploads.completeBatch(link, cookieValue, getParam(req, "batchId"));
  res.json({ success: true, data: result });
});

export const hostPresign = asyncHandler(async (req, res) => {
  const result = await hostUploads.presignHostUploads(req.auth!.userId, getParam(req, "eventId"), req.body);
  res.json({ success: true, data: result });
});

export const hostComplete = asyncHandler(async (req, res) => {
  const result = await hostUploads.completeHostUploads(req.auth!.userId, getParam(req, "eventId"), req.body);
  res.status(201).json({ success: true, data: result });
});
