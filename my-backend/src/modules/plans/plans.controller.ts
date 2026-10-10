import { asyncHandler } from "../../lib/asyncHandler";
import { getParam } from "../../lib/params";
import * as plansService from "./plans.service";

export const listActive = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { plans: await plansService.listActivePlans() } });
});

export const listAll = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { plans: await plansService.listAllPlans() } });
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: { plan: await plansService.createPlan(req.body) } });
});

export const update = asyncHandler(async (req, res) => {
  const plan = await plansService.updatePlan(getParam(req, "id"), req.body);
  res.json({ success: true, data: { plan } });
});
