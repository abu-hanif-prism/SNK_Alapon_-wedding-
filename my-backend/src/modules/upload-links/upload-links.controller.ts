import { asyncHandler } from "../../lib/asyncHandler";
import { getParam } from "../../lib/params";
import * as service from "./upload-links.service";

export const create = asyncHandler(async (req, res) => {
  const result = await service.createUploadLink(req.auth!.userId, getParam(req, "eventId"), req.body);
  res.status(201).json({ success: true, data: result });
});

export const list = asyncHandler(async (req, res) => {
  const links = await service.listUploadLinks(req.auth!.userId, getParam(req, "eventId"));
  res.json({ success: true, data: { links } });
});

export const share = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.getShare(req.auth!.userId, getParam(req, "eventId")) });
});

export const update = asyncHandler(async (req, res) => {
  const link = await service.updateUploadLink(req.auth!.userId, getParam(req, "eventId"), getParam(req, "linkId"), req.body);
  res.json({ success: true, data: { link } });
});

export const revoke = asyncHandler(async (req, res) => {
  await service.revokeUploadLink(req.auth!.userId, getParam(req, "eventId"), getParam(req, "linkId"));
  res.json({ success: true });
});
