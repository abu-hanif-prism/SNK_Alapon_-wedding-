import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../middleware/validate";
import * as controller from "./guests.controller";
import { pinSchema, tokenParamSchema, updateGuestSchema } from "./guests.schema";

// Public endpoints reached from a QR code. Many guests at a venue share one IP, so the limit is generous.
const guestLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, slow down" },
});

export const guestsRouter = Router();
guestsRouter.use(guestLimiter);

guestsRouter.post("/:token/session", validate(tokenParamSchema, "params"), controller.openSession);
guestsRouter.post("/:token/unlock", validate(tokenParamSchema, "params"), validate(pinSchema), controller.unlock);
guestsRouter.patch("/:token/guest", validate(tokenParamSchema, "params"), validate(updateGuestSchema), controller.renameGuest);
