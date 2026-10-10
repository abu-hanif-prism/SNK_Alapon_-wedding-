import { Router } from "express";
import { idParamSchema } from "../../lib/params";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import * as controller from "./plans.controller";
import { createPlanSchema, updatePlanSchema } from "./plans.schema";

// Public: plans a host can buy.
export const plansRouter = Router();
plansRouter.get("/", controller.listActive);

// Admin: manage plans. Plans are deactivated (isActive=false), never deleted.
export const adminPlansRouter = Router();
adminPlansRouter.use(authenticate, requireRole("ADMIN"));
adminPlansRouter.get("/", controller.listAll);
adminPlansRouter.post("/", validate(createPlanSchema), controller.create);
adminPlansRouter.patch("/:id", validate(idParamSchema, "params"), validate(updatePlanSchema), controller.update);
