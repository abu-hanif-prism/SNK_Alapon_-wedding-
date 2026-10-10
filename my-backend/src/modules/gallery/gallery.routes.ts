import { Router } from "express";
import { validate } from "../../middleware/validate";
import * as controller from "./gallery.controller";
import {
  blockParamsSchema,
  coverSchema,
  curationSchema,
  createBlockSchema,
  createSectionSchema,
  galleryParamsSchema,
  moveBlockSchema,
  reorderSchema,
  sectionParamsSchema,
  setBlockPhotosSchema,
  updateBlockSchema,
  updateSectionSchema,
} from "./gallery.schema";

// Mounted under /api/events/:eventId/gallery (auth and HOST role come from the events router).
export const galleryRouter = Router({ mergeParams: true });

const event = validate(galleryParamsSchema, "params");
const section = validate(sectionParamsSchema, "params");
const block = validate(blockParamsSchema, "params");

galleryRouter.get("/", event, controller.get);
galleryRouter.post("/reset-to-template", event, controller.resetToTemplate);
galleryRouter.post("/autofill", event, controller.autofill);
// The simple editor: pick photos, group them into chapters, reorder. Layout is automatic.
galleryRouter.get("/curation", event, controller.getCuration);
galleryRouter.put("/curation", event, validate(curationSchema), controller.saveCuration);
galleryRouter.put("/cover", event, validate(coverSchema), controller.setCover);

// Chapters
galleryRouter.post("/sections", event, validate(createSectionSchema), controller.createSection);
galleryRouter.post("/sections/reorder", event, validate(reorderSchema), controller.reorderSections);
galleryRouter.patch("/sections/:sectionId", section, validate(updateSectionSchema), controller.updateSection);
galleryRouter.delete("/sections/:sectionId", section, controller.deleteSection);

// Blocks
galleryRouter.post("/sections/:sectionId/blocks", section, validate(createBlockSchema), controller.createBlock);
galleryRouter.post("/sections/:sectionId/blocks/reorder", section, validate(reorderSchema), controller.reorderBlocks);
galleryRouter.patch("/blocks/:blockId", block, validate(updateBlockSchema), controller.updateBlock);
galleryRouter.post("/blocks/:blockId/move", block, validate(moveBlockSchema), controller.moveBlock);
galleryRouter.delete("/blocks/:blockId", block, controller.deleteBlock);

// Photos in a block
galleryRouter.put("/blocks/:blockId/photos", block, validate(setBlockPhotosSchema), controller.setBlockPhotos);
