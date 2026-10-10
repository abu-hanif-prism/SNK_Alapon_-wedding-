import { z } from "zod";
import { PaymentStatus } from "../../generated/prisma/enums";
import { paginationSchema } from "../../lib/params";

export const startBkashPaymentSchema = z.object({
  subscriptionId: z.uuid(),
});

// bKash redirects the customer's browser here with these query params.
export const bkashCallbackQuerySchema = z.object({
  paymentID: z.string().min(1).max(100),
  status: z.string().max(30),
});

export const adminListPaymentsSchema = paginationSchema.extend({
  status: z.enum(PaymentStatus).optional(),
});

export type BkashCallbackQuery = z.infer<typeof bkashCallbackQuerySchema>;
export type AdminListPaymentsQuery = z.infer<typeof adminListPaymentsSchema>;
