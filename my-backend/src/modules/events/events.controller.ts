import { asyncHandler } from "../../lib/asyncHandler";
import { getParam, getQuery } from "../../lib/params";
import { ensurePrimaryLink } from "../upload-links/upload-links.service";
import type { AdminListEventsQuery, SlugCheckQuery } from "./events.schema";
import * as service from "./events.service";

export const create = asyncHandler(async (req, res) => {
  const event = await service.createEvent(req.auth!.userId, req.body);
  res.status(201).json({ success: true, data: { event } });
});

export const listMine = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { events: await service.listForHost(req.auth!.userId) } });
});

export const getMine = asyncHandler(async (req, res) => {
  const event = await service.getForHost(req.auth!.userId, getParam(req, "id"));
  res.json({ success: true, data: { event } });
});

export const update = asyncHandler(async (req, res) => {
  const event = await service.updateEvent(req.auth!.userId, getParam(req, "id"), req.body);
  res.json({ success: true, data: { event } });
});

export const publish = asyncHandler(async (req, res) => {
  const event = await service.publishEvent(req.auth!.userId, getParam(req, "id"));
  await ensurePrimaryLink(event); // the QR code is ready as soon as the website is live
  res.json({ success: true, data: { event } });
});

export const unpublish = asyncHandler(async (req, res) => {
  const event = await service.unpublishEvent(req.auth!.userId, getParam(req, "id"));
  res.json({ success: true, data: { event } });
});

export const upgrade = asyncHandler(async (req, res) => {
  const event = await service.upgradeEvent(req.auth!.userId, getParam(req, "id"), req.body.subscriptionId);
  res.json({ success: true, data: { event } });
});

export const slugCheck = asyncHandler(async (_req, res) => {
  const { slug, city } = getQuery<SlugCheckQuery>(res);
  res.json({ success: true, data: await service.checkSlug(slug, city) });
});

export const adminList = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await service.listForAdmin(getQuery<AdminListEventsQuery>(res)) });
});
