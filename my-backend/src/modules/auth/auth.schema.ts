import { z } from "zod";
import { normalizeBdPhone } from "../../lib/phone";

// Trim and lowercase first, then validate (phone keyboards often add a trailing space).
const email = z.string().trim().toLowerCase().pipe(z.email());
const password = z.string().min(8).max(128);

// Accepts 01712345678, +8801712345678 etc. and stores the canonical +8801712345678.
const bdPhone = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const phone = normalizeBdPhone(value);
    if (!phone) ctx.addIssue({ code: "custom", message: "Enter a valid Bangladesh mobile number" });
    return phone ?? z.NEVER;
  });

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email,
  password,
  phone: bdPhone,
});

export const updatePhoneSchema = z.object({ phone: bdPhone });

export const verifyPhoneSchema = z.object({ code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") });

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdatePhoneInput = z.infer<typeof updatePhoneSchema>;
export type VerifyPhoneInput = z.infer<typeof verifyPhoneSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
