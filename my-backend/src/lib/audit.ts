import type { Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma";

// Records who did what to what. Used for admin actions that change other people's data.
export async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
  client: Prisma.TransactionClient = prisma,
) {
  await client.auditLog.create({
    data: { actorId, action, entityType, entityId, metadata: metadata as Prisma.InputJsonValue },
  });
}
