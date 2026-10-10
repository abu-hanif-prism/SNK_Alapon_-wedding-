import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { getParam, getQuery, idParamSchema } from "../../lib/params";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { listPhotosQuerySchema, moderateSchema, type ListPhotosQuery } from "../photos/photos.schema";
import {
  auditLogsQuerySchema,
  eventStatusSchema,
  listUsersSchema,
  subscriptionActionSchema,
  updateUserSchema,
  type AuditLogsQuery,
  type ListUsersQuery,
} from "./admin.schema";
import * as service from "./admin.service";

// Everything under /api/admin that is not a plain list owned by another module
// (plans, templates, block types, payments, the events list and the subscriptions list live there).
export const adminRouter = Router();
adminRouter.use(authenticate, requireRole("ADMIN"));

const adminId = (req: { auth?: { userId: string } }) => req.auth!.userId;
const id = validate(idParamSchema, "params");

adminRouter.get("/stats", asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await service.getStats() });
}));

// Hosts
adminRouter.get("/users", validate(listUsersSchema, "query"), asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await service.listUsers(getQuery<ListUsersQuery>(res)) });
}));

adminRouter.get("/users/:id", id, asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: await service.getUser(getParam(req, "id")) } });
}));

adminRouter.patch("/users/:id", id, validate(updateUserSchema), asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: await service.setUserStatus(adminId(req), getParam(req, "id"), req.body.status) } });
}));

// Events: detail, publish/hide/archive, and moderation of any event's photos
adminRouter.get("/events/:id", id, asyncHandler(async (req, res) => {
  res.json({ success: true, data: { event: await service.getEvent(getParam(req, "id")) } });
}));

adminRouter.patch("/events/:id/status", id, validate(eventStatusSchema), asyncHandler(async (req, res) => {
  res.json({ success: true, data: { event: await service.setEventStatus(adminId(req), getParam(req, "id"), req.body.status) } });
}));

adminRouter.get("/events/:id/photos", id, validate(listPhotosQuerySchema, "query"), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.listPhotos(getParam(req, "id"), getQuery<ListPhotosQuery>(res)) });
}));

adminRouter.post("/events/:id/photos/moderate", id, validate(moderateSchema), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.moderate(adminId(req), getParam(req, "id"), req.body) });
}));

// Subscriptions: activate (manual payment check), cancel, extend
adminRouter.post("/subscriptions/:id/action", id, validate(subscriptionActionSchema), asyncHandler(async (req, res) => {
  res.json({ success: true, data: { subscription: await service.subscriptionAction(adminId(req), getParam(req, "id"), req.body) } });
}));

adminRouter.get("/audit-logs", validate(auditLogsQuerySchema, "query"), asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await service.listAuditLogs(getQuery<AuditLogsQuery>(res)) });
}));
