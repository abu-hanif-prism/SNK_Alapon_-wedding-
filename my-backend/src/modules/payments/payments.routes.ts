import { Router } from "express";
import rateLimit from "express-rate-limit";
import { idParamSchema } from "../../lib/params";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import * as controller from "./payments.controller";
import { adminListPaymentsSchema, bkashCallbackQuerySchema, startBkashPaymentSchema } from "./payments.schema";

const callbackLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

export const paymentsRouter = Router();

// Public on purpose: bKash redirects the customer's browser here. Safe because the
// result is re-verified with bKash server-to-server, never taken from the query string.
paymentsRouter.get(
  "/bkash/callback",
  callbackLimiter,
  validate(bkashCallbackQuerySchema, "query"),
  controller.bkashCallback,
);

paymentsRouter.post(
  "/bkash/create",
  authenticate,
  requireRole("HOST"),
  validate(startBkashPaymentSchema),
  controller.startBkash,
);
paymentsRouter.get("/:id", authenticate, requireRole("HOST"), validate(idParamSchema, "params"), controller.getMine);

export const adminPaymentsRouter = Router();
adminPaymentsRouter.use(authenticate, requireRole("ADMIN"));
adminPaymentsRouter.get("/", validate(adminListPaymentsSchema, "query"), controller.adminList);
