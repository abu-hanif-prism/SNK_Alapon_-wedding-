import type { Prisma } from "../../generated/prisma/client";
import { compact } from "../../lib/compact";
import { HttpError } from "../../lib/httpError";
import { toJson } from "../../lib/json";
import { prisma } from "../../lib/prisma";
import type {
  CreateBlockTypeInput,
  CreateTemplateInput,
  CreateVersionInput,
  ListTemplatesQuery,
  UpdateBlockTypeInput,
  UpdateTemplateInput,
} from "./templates.schema";

// --- templates

// What a host sees when choosing a template: active templates and their versions (optionally for one edition).
export const listForHosts = (query: ListTemplatesQuery) =>
  prisma.template.findMany({
    where: {
      isActive: true,
      versions: { some: query.edition ? { edition: query.edition } : {} },
    },
    orderBy: { name: "asc" },
    include: {
      versions: {
        where: query.edition ? { edition: query.edition } : {},
        orderBy: [{ edition: "asc" }, { version: "desc" }],
        select: { id: true, version: true, edition: true, themeDefaults: true },
      },
    },
  });

export const listForAdmin = () =>
  prisma.template.findMany({
    orderBy: { name: "asc" },
    include: { versions: { orderBy: [{ edition: "asc" }, { version: "desc" }] } },
  });

export async function createTemplate(input: CreateTemplateInput) {
  if (await prisma.template.findUnique({ where: { code: input.code } })) {
    throw HttpError.conflict("A template with this code already exists");
  }
  return prisma.template.create({ data: input });
}

export async function updateTemplate(id: string, input: UpdateTemplateInput) {
  if (!(await prisma.template.findUnique({ where: { id } }))) throw HttpError.notFound("Template not found");
  return prisma.template.update({ where: { id }, data: compact(input) });
}

export async function createVersion(templateId: string, input: CreateVersionInput) {
  if (!(await prisma.template.findUnique({ where: { id: templateId } }))) {
    throw HttpError.notFound("Template not found");
  }

  const duplicate = await prisma.templateVersion.findUnique({
    where: { templateId_version_edition: { templateId, version: input.version, edition: input.edition } },
  });
  if (duplicate) throw HttpError.conflict("This version already exists for that edition");

  return prisma.templateVersion.create({
    data: {
      templateId,
      version: input.version,
      edition: input.edition,
      layoutDefinition: toJson(input.layoutDefinition),
      themeDefaults: toJson(input.themeDefaults),
    },
  });
}

// --- block types

export const listBlockTypes = () => prisma.blockType.findMany({ orderBy: [{ minPhotos: "asc" }, { code: "asc" }] });

export async function createBlockType(input: CreateBlockTypeInput) {
  if (await prisma.blockType.findUnique({ where: { code: input.code } })) {
    throw HttpError.conflict("A block type with this code already exists");
  }
  return prisma.blockType.create({ data: { ...input, responsiveConfig: toJson(input.responsiveConfig) } });
}

export async function updateBlockType(id: string, input: UpdateBlockTypeInput) {
  const existing = await prisma.blockType.findUnique({ where: { id } });
  if (!existing) throw HttpError.notFound("Block type not found");

  const minPhotos = input.minPhotos ?? existing.minPhotos;
  const maxPhotos = input.maxPhotos ?? existing.maxPhotos;
  if (minPhotos > maxPhotos) throw HttpError.badRequest("minPhotos must be <= maxPhotos");

  const { responsiveConfig, ...rest } = input;
  const data: Prisma.BlockTypeUpdateInput = {
    ...compact(rest),
    ...(responsiveConfig !== undefined && { responsiveConfig: toJson(responsiveConfig) }),
  };

  return prisma.blockType.update({ where: { id }, data });
}
