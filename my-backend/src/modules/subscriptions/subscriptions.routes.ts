import { Router } from "express";
import { idParamSchema } from "../../lib/params";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import * as controller from "./subscriptions.controller";
import { adminListSubscriptionsSchema, createSubscriptionSchema } from "./subscriptions.schema";

// Host: buy and view own subscriptions.
export const subscriptionsRouter = Router();
subscriptionsRouter.use(authenticate, requireRole("HOST"));
subscriptionsRouter.post("/", validate(createSubscriptionSchema), controller.create);
subscriptionsRouter.get("/", controller.listMine);
subscriptionsRouter.get("/:id", validate(idParamSchema, "params"), controller.getMine);

// Admin: view all subscriptions.
export const adminSubscriptionsRouter = Router();
adminSubscriptionsRouter.use(authenticate, requireRole("ADMIN"));
adminSubscriptionsRouter.get("/", validate(adminListSubscriptionsSchema, "query"), controller.adminList);
