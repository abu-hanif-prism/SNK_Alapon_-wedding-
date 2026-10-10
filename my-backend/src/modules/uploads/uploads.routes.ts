import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../middleware/validate";
import { tokenParamSchema } from "../guests/guests.schema";
import * as controller from "./uploads.controller";
import { createBatchSchema, guestBatchParamsSchema } from "./uploads.schema";

// Guest uploads, mounted at /api/u next to the guest session routes.
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, slow down" },
});

export const guestUploadsRouter = Router();
guestUploadsRouter.use(uploadLimiter);

guestUploadsRouter.post("/:token/batches", validate(tokenParamSchema, "params"), validate(createBatchSchema), controller.reserveBatch);
guestUploadsRouter.post("/:token/batches/:batchId/complete", validate(guestBatchParamsSchema, "params"), controller.completeBatch);
