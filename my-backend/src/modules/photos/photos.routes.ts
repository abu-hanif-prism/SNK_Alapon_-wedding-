import { Router } from "express";
import { validate } from "../../middleware/validate";
import { eventIdParamSchema } from "../upload-links/upload-links.schema";
import * as uploads from "../uploads/uploads.controller";
import { hostCompleteSchema, hostPresignSchema } from "../uploads/uploads.schema";
import * as controller from "./photos.controller";
import {
  downloadQuerySchema,
  listPhotosQuerySchema,
  moderateSchema,
  photoParamsSchema,
  updatePhotoSchema,
} from "./photos.schema";

// Mounted under /api/events/:eventId/photos (auth and HOST role come from the events router).
export const eventPhotosRouter = Router({ mergeParams: true });

eventPhotosRouter.get("/", validate(eventIdParamSchema, "params"), validate(listPhotosQuerySchema, "query"), controller.list);
eventPhotosRouter.post("/moderate", validate(eventIdParamSchema, "params"), validate(moderateSchema), controller.moderate);

// Host uploads: presign -> PUT files to the returned URLs -> complete.
eventPhotosRouter.post("/uploads/presign", validate(eventIdParamSchema, "params"), validate(hostPresignSchema), uploads.hostPresign);
eventPhotosRouter.post("/uploads/complete", validate(eventIdParamSchema, "params"), validate(hostCompleteSchema), uploads.hostComplete);

eventPhotosRouter.patch("/:photoId", validate(photoParamsSchema, "params"), validate(updatePhotoSchema), controller.updateCaption);
eventPhotosRouter.get("/:photoId/download", validate(photoParamsSchema, "params"), validate(downloadQuerySchema, "query"), controller.download);
