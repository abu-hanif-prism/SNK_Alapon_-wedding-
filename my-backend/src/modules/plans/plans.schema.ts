import { z } from "zod";
import { BillingPeriod } from "../../generated/prisma/enums";

const bigIntInput = z
  .union([z.number().int().positive(), z.string().regex(/^[1-9]\d*$/, "Must be a positive integer")])
  .transform((value) => BigInt(value));

// Accepts 499 or "499.50"; at most 2 decimals. Kept as a string so Decimal stays exact.
const money = z
  .union([z.number().nonnegative(), z.string()])
  .transform(String)
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a number with at most 2 decimals"));

const currency = z.string().trim().toUpperCase().length(3);

const editableFields = {
  name: z.string().trim().min(1).max(100),
  edition: z.number().int().positive(),
  maxEvents: z.number().int().positive(),
  storageLimitBytes: bigIntInput,
  price: money,
  currency,
  billingPeriod: z.enum(BillingPeriod),
  // How many months the website stays active after payment (e.g. 2 or 12). null = follow billingPeriod.
  durationMonths: z.number().int().min(1).max(120).nullable(),
  isActive: z.boolean(),
};

export const createPlanSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,40}$/, "Use lowercase letters, digits and dashes"),
  ...editableFields,
  currency: currency.default("BDT"),
  durationMonths: z.number().int().min(1).max(120).nullable().default(null),
  isActive: z.boolean().default(true),
});

// code is immutable. Changing a plan never affects existing subscriptions (they are snapshots).
export const updatePlanSchema = z.object(editableFields).partial();

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
