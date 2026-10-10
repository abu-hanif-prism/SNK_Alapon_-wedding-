import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { getParam } from "../../lib/params";
import { unlockWithPin } from "../../lib/pinUnlock";
import { SLUG_PATTERN } from "../../lib/slug";
import { validate } from "../../middleware/validate";
import { pinSchema } from "../guests/guests.schema";
import * as service from "./public.service";

const slugParams = z.object({ slug: z.string().min(3).max(60).regex(SLUG_PATTERN) });
const photoParams = slugParams.extend({ photoId: z.uuid() });

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, slow down" },
});

// No login: anyone with the link can view a published gallery (unless the host set a PIN).
export const publicRouter = Router();
publicRouter.use(publicLimiter);

publicRouter.get(
  "/events/:slug",
  validate(slugParams, "params"),
  asyncHandler(async (req, res) => {
    const gallery = await service.getPublicGallery(getParam(req, "slug"), req.cookies);
    // Private cache only: the same URL answers differently before and after the PIN is entered.
    res.setHeader("Cache-Control", "private, max-age=60");
    res.json({ success: true, data: gallery });
  }),
);

// Checks the 4-digit PIN and, if it is right, sets an access cookie for this event.
publicRouter.post(
  "/events/:slug/unlock",
  validate(slugParams, "params"),
  validate(pinSchema),
  asyncHandler(async (req, res) => {
    const event = await service.findPublicEvent(getParam(req, "slug"));
    await unlockWithPin(req, res, event, req.body.pin);
    res.json({ success: true });
  }),
);

// Redirects to a short-lived attachment URL, so a plain <a href> download link works.
publicRouter.get(
  "/events/:slug/photos/:photoId/download",
  validate(photoParams, "params"),
  asyncHandler(async (req, res) => {
    const url = await service.getPublicDownloadUrl(getParam(req, "slug"), getParam(req, "photoId"), req.cookies);
    res.setHeader("Cache-Control", "no-store");
    res.redirect(url);
  }),
);
