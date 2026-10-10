import { Router } from "express";
import { idParamSchema } from "../../lib/params";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { galleryRouter } from "../gallery/gallery.routes";
import { eventPhotosRouter } from "../photos/photos.routes";
import { uploadLinksRouter } from "../upload-links/upload-links.routes";
import * as controller from "./events.controller";
import { adminListEventsSchema, createEventSchema, slugCheckQuerySchema, updateEventSchema, upgradeEventSchema } from "./events.schema";

export const eventsRouter = Router();
eventsRouter.use(authenticate, requireRole("HOST"));

eventsRouter.post("/", validate(createEventSchema), controller.create);
eventsRouter.get("/", controller.listMine);
eventsRouter.get("/slug-check", validate(slugCheckQuerySchema, "query"), controller.slugCheck);
eventsRouter.get("/:id", validate(idParamSchema, "params"), controller.getMine);
eventsRouter.patch("/:id", validate(idParamSchema, "params"), validate(updateEventSchema), controller.update);
eventsRouter.post("/:id/publish", validate(idParamSchema, "params"), controller.publish);
eventsRouter.post("/:id/unpublish", validate(idParamSchema, "params"), controller.unpublish);
eventsRouter.post("/:id/upgrade", validate(idParamSchema, "params"), validate(upgradeEventSchema), controller.upgrade);

// /api/events/:eventId/upload-links
eventsRouter.use("/:eventId/upload-links", uploadLinksRouter);

// /api/events/:eventId/photos
eventsRouter.use("/:eventId/photos", eventPhotosRouter);

// /api/events/:eventId/gallery
eventsRouter.use("/:eventId/gallery", galleryRouter);

export const adminEventsRouter = Router();
adminEventsRouter.use(authenticate, requireRole("ADMIN"));
adminEventsRouter.get("/", validate(adminListEventsSchema, "query"), controller.adminList);
