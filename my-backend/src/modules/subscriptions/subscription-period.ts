import type { BillingPeriod } from "../../generated/prisma/enums";

// Adds calendar months in UTC, clamping to the last day of the month (Jan 31 + 1 month = Feb 28/29,
// not the overflowing Mar 3 that Date.setMonth would give).
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

// ONE_TIME plans without a duration have no end date; the others run for one period from activation.
export function computeEndsAt(startsAt: Date, billingPeriod: BillingPeriod, durationMonths: number | null = null): Date | null {
  // A package that says "active for 2 months" wins over the generic billing period.
  if (durationMonths !== null) return addMonths(startsAt, durationMonths);

  switch (billingPeriod) {
    case "MONTHLY":
      return addMonths(startsAt, 1);
    case "YEARLY":
      return addMonths(startsAt, 12);
    case "ONE_TIME":
      return null;
  }
}
