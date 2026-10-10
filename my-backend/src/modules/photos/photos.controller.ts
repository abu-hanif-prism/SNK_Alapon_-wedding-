import { asyncHandler } from "../../lib/asyncHandler";
import { getParam, getQuery } from "../../lib/params";
import type { DownloadQuery, ListPhotosQuery } from "./photos.schema";
import * as service from "./photos.service";

export const list = asyncHandler(async (req, res) => {
  const result = await service.listPhotos(req.auth!.userId, getParam(req, "eventId"), getQuery<ListPhotosQuery>(res));
  res.json({ success: true, data: result });
});

export const moderate = asyncHandler(async (req, res) => {
  const result = await service.moderate(req.auth!.userId, getParam(req, "eventId"), req.body);
  res.json({ success: true, data: result });
});

export const updateCaption = asyncHandler(async (req, res) => {
  const photo = await service.updateCaption(req.auth!.userId, getParam(req, "eventId"), getParam(req, "photoId"), req.body);
  res.json({ success: true, data: { photo } });
});

export const download = asyncHandler(async (req, res) => {
  const result = await service.getHostDownloadUrl(
    req.auth!.userId,
    getParam(req, "eventId"),
    getParam(req, "photoId"),
    getQuery<DownloadQuery>(res),
  );
  res.json({ success: true, data: result });
});
