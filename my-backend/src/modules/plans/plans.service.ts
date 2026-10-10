import { compact } from "../../lib/compact";
import { HttpError } from "../../lib/httpError";
import { prisma } from "../../lib/prisma";
import type { CreatePlanInput, UpdatePlanInput } from "./plans.schema";

export const listActivePlans = () =>
  prisma.plan.findMany({ where: { isActive: true }, orderBy: [{ price: "asc" }, { edition: "asc" }] });

export const listAllPlans = () => prisma.plan.findMany({ orderBy: { createdAt: "desc" } });

export async function createPlan(input: CreatePlanInput) {
  const existing = await prisma.plan.findUnique({ where: { code: input.code } });
  if (existing) throw HttpError.conflict("A plan with this code already exists");

  return prisma.plan.create({ data: input });
}

export async function updatePlan(id: string, input: UpdatePlanInput) {
  const existing = await prisma.plan.findUnique({ where: { id } });
  if (!existing) throw HttpError.notFound("Plan not found");

  return prisma.plan.update({ where: { id }, data: compact(input) });
}
