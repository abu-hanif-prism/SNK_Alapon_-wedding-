import { asyncHandler } from "../../lib/asyncHandler";
import { getParam, getQuery } from "../../lib/params";
import * as subscriptionsService from "./subscriptions.service";
import type { AdminListSubscriptionsQuery } from "./subscriptions.schema";

export const create = asyncHandler(async (req, res) => {
  const subscription = await subscriptionsService.createForHost(req.auth!.userId, req.body.planId);
  res.status(201).json({ success: true, data: { subscription } });
});

export const listMine = asyncHandler(async (req, res) => {
  const subscriptions = await subscriptionsService.listForHost(req.auth!.userId);
  res.json({ success: true, data: { subscriptions } });
});

export const getMine = asyncHandler(async (req, res) => {
  const subscription = await subscriptionsService.getForHost(req.auth!.userId, getParam(req, "id"));
  res.json({ success: true, data: { subscription } });
});

export const adminList = asyncHandler(async (_req, res) => {
  const result = await subscriptionsService.listForAdmin(getQuery<AdminListSubscriptionsQuery>(res));
  res.json({ success: true, data: result });
});
