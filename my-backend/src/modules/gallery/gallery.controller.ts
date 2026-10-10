import { asyncHandler } from "../../lib/asyncHandler";
import { getParam } from "../../lib/params";
import * as curation from "./gallery.curation";
import * as service from "./gallery.service";

const hostId = (req: { auth?: { userId: string } }) => req.auth!.userId;

export const get = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.getGallery(hostId(req), getParam(req, "eventId")) });
});

export const resetToTemplate = asyncHandler(async (req, res) => {
  await service.resetToTemplate(hostId(req), getParam(req, "eventId"));
  res.json({ success: true, data: await service.getGallery(hostId(req), getParam(req, "eventId")) });
});

export const autofill = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.autofill(hostId(req), getParam(req, "eventId")) });
});

export const setCover = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.setCover(hostId(req), getParam(req, "eventId"), req.body.photoId) });
});

export const getCuration = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await curation.getCuration(hostId(req), getParam(req, "eventId")) });
});

export const saveCuration = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await curation.saveCuration(hostId(req), getParam(req, "eventId"), req.body.chapters) });
});

// sections
export const createSection = asyncHandler(async (req, res) => {
  const section = await service.createSection(hostId(req), getParam(req, "eventId"), req.body);
  res.status(201).json({ success: true, data: { section } });
});

export const updateSection = asyncHandler(async (req, res) => {
  const section = await service.updateSection(hostId(req), getParam(req, "eventId"), getParam(req, "sectionId"), req.body);
  res.json({ success: true, data: { section } });
});

export const reorderSections = asyncHandler(async (req, res) => {
  await service.reorderSections(hostId(req), getParam(req, "eventId"), req.body.ids);
  res.json({ success: true });
});

export const deleteSection = asyncHandler(async (req, res) => {
  await service.deleteSection(hostId(req), getParam(req, "eventId"), getParam(req, "sectionId"));
  res.json({ success: true });
});

// blocks
export const createBlock = asyncHandler(async (req, res) => {
  const block = await service.createBlock(hostId(req), getParam(req, "eventId"), getParam(req, "sectionId"), req.body);
  res.status(201).json({ success: true, data: { block } });
});

export const updateBlock = asyncHandler(async (req, res) => {
  const block = await service.updateBlock(hostId(req), getParam(req, "eventId"), getParam(req, "blockId"), req.body);
  res.json({ success: true, data: { block } });
});

export const reorderBlocks = asyncHandler(async (req, res) => {
  await service.reorderBlocks(hostId(req), getParam(req, "eventId"), getParam(req, "sectionId"), req.body.ids);
  res.json({ success: true });
});

export const moveBlock = asyncHandler(async (req, res) => {
  await service.moveBlock(hostId(req), getParam(req, "eventId"), getParam(req, "blockId"), req.body);
  res.json({ success: true });
});

export const deleteBlock = asyncHandler(async (req, res) => {
  await service.deleteBlock(hostId(req), getParam(req, "eventId"), getParam(req, "blockId"));
  res.json({ success: true });
});

export const setBlockPhotos = asyncHandler(async (req, res) => {
  const result = await service.setBlockPhotos(hostId(req), getParam(req, "eventId"), getParam(req, "blockId"), req.body);
  res.json({ success: true, data: result });
});
