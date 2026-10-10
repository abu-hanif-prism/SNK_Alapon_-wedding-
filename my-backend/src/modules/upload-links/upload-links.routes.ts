import { Router } from "express";
import { validate } from "../../middleware/validate";
import * as controller from "./upload-links.controller";
import { createUploadLinkSchema, eventIdParamSchema, linkParamsSchema, updateUploadLinkSchema } from "./upload-links.schema";

// Mounted under /api/events/:eventId/upload-links (auth and HOST role come from the events router).
export const uploadLinksRouter = Router({ mergeParams: true });

uploadLinksRouter.post("/", validate(eventIdParamSchema, "params"), validate(createUploadLinkSchema), controller.create);
uploadLinksRouter.get("/", validate(eventIdParamSchema, "params"), controller.list);
// The link and QR code to hand to guests (created automatically if the event has none yet).
uploadLinksRouter.get("/share", validate(eventIdParamSchema, "params"), controller.share);
uploadLinksRouter.patch("/:linkId", validate(linkParamsSchema, "params"), validate(updateUploadLinkSchema), controller.update);
uploadLinksRouter.post("/:linkId/revoke", validate(linkParamsSchema, "params"), controller.revoke);
