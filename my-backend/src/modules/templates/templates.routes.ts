import { Router } from "express";
import { idParamSchema } from "../../lib/params";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import * as controller from "./templates.controller";
import {
  createBlockTypeSchema,
  createTemplateSchema,
  createVersionSchema,
  listTemplatesQuerySchema,
  updateBlockTypeSchema,
  updateTemplateSchema,
} from "./templates.schema";

// Any logged-in user: templates to pick from, and the block catalogue the gallery editor uses.
export const templatesRouter = Router();
templatesRouter.get("/", authenticate, validate(listTemplatesQuerySchema, "query"), controller.listForHosts);

export const blockTypesRouter = Router();
blockTypesRouter.get("/", authenticate, controller.listBlockTypes);

// Admin
export const adminTemplatesRouter = Router();
adminTemplatesRouter.use(authenticate, requireRole("ADMIN"));
adminTemplatesRouter.get("/", controller.listForAdmin);
adminTemplatesRouter.post("/", validate(createTemplateSchema), controller.createTemplate);
adminTemplatesRouter.patch("/:id", validate(idParamSchema, "params"), validate(updateTemplateSchema), controller.updateTemplate);
adminTemplatesRouter.post("/:id/versions", validate(idParamSchema, "params"), validate(createVersionSchema), controller.createVersion);

export const adminBlockTypesRouter = Router();
adminBlockTypesRouter.use(authenticate, requireRole("ADMIN"));
adminBlockTypesRouter.get("/", controller.listBlockTypes);
adminBlockTypesRouter.post("/", validate(createBlockTypeSchema), controller.createBlockType);
adminBlockTypesRouter.patch("/:id", validate(idParamSchema, "params"), validate(updateBlockTypeSchema), controller.updateBlockType);
