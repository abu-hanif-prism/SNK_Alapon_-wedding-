import { asyncHandler } from "../../lib/asyncHandler";
import { getParam, getQuery } from "../../lib/params";
import type { ListTemplatesQuery } from "./templates.schema";
import * as service from "./templates.service";

export const listForHosts = asyncHandler(async (_req, res) => {
  const templates = await service.listForHosts(getQuery<ListTemplatesQuery>(res));
  res.json({ success: true, data: { templates } });
});

export const listForAdmin = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { templates: await service.listForAdmin() } });
});

export const createTemplate = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: { template: await service.createTemplate(req.body) } });
});

export const updateTemplate = asyncHandler(async (req, res) => {
  const template = await service.updateTemplate(getParam(req, "id"), req.body);
  res.json({ success: true, data: { template } });
});

export const createVersion = asyncHandler(async (req, res) => {
  const version = await service.createVersion(getParam(req, "id"), req.body);
  res.status(201).json({ success: true, data: { version } });
});

export const listBlockTypes = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { blockTypes: await service.listBlockTypes() } });
});

export const createBlockType = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: { blockType: await service.createBlockType(req.body) } });
});

export const updateBlockType = asyncHandler(async (req, res) => {
  const blockType = await service.updateBlockType(getParam(req, "id"), req.body);
  res.json({ success: true, data: { blockType } });
});
