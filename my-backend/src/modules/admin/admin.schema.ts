import { z } from "zod";
import { EventStatus, UserRole, UserStatus } from "../../generated/prisma/enums";
import { paginationSchema } from "../../lib/params";

export const listUsersSchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  role: z.enum(UserRole).optional(),
  status: z.enum(UserStatus).optional(),
});

export const updateUserSchema = z.object({ status: z.enum(UserStatus) });

export const eventStatusSchema = z.object({ status: z.enum(EventStatus) });

export const subscriptionActionSchema = z.discriminatedUnion("action", [
  // Marks a PENDING_PAYMENT subscription as paid (for example after checking a bKash transaction by hand).
  z.object({ action: z.literal("activate") }),
  // Ends the subscription now and archives its events.
  z.object({ action: z.literal("cancel") }),
  // Adds months to the end date (reactivates an expired subscription and restores its events).
  z.object({ action: z.literal("extend"), months: z.number().int().min(1).max(60) }),
]);

export const auditLogsQuerySchema = paginationSchema.extend({
  entityType: z.string().trim().max(50).optional(),
  actorId: z.uuid().optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersSchema>;
export type SubscriptionActionInput = z.infer<typeof subscriptionActionSchema>;
export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;
