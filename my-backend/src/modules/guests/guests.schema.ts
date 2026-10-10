import { z } from "zod";

export const tokenParamSchema = z.object({ token: z.string().min(20).max(100) });

export const pinSchema = z.object({ pin: z.string().regex(/^\d{4}$/, "The PIN is 4 digits") });

export const updateGuestSchema = z.object({
  displayName: z.string().trim().min(1).max(60).nullable(),
});

export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;
