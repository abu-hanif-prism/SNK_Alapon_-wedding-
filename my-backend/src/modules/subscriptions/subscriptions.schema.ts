import { z } from "zod";
import { SubscriptionStatus } from "../../generated/prisma/enums";
import { paginationSchema } from "../../lib/params";

export const createSubscriptionSchema = z.object({
  planId: z.uuid(),
});

export const adminListSubscriptionsSchema = paginationSchema.extend({
  status: z.enum(SubscriptionStatus).optional(),
});

export type AdminListSubscriptionsQuery = z.infer<typeof adminListSubscriptionsSchema>;
