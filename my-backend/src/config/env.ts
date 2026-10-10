import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  STORAGE_MODE: z.enum(["mock", "live"]).default("mock"),
  // Public base URL of this API; the mock storage builds its signed URLs from it.
  API_BASE_URL: z.url(),
  // Login/register attempts allowed per IP per 15 minutes.
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(20),
  // Number of reverse proxies in front of the API (0 = none). Needed for correct client IPs in rate limiting.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  JOBS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),

  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),

  BKASH_MODE: z.enum(["mock", "live"]).default("mock"),
  FRONTEND_URL: z.url(),
  BKASH_BASE_URL: z.url(),
  BKASH_APP_KEY: z.string().min(1),
  BKASH_APP_SECRET: z.string().min(1),
  BKASH_USERNAME: z.string().min(1),
  BKASH_PASSWORD: z.string().min(1),
  BKASH_CALLBACK_URL: z.url(),

  SMS_MODE: z.enum(["mock", "live"]).default("mock"),
  SMS_API_URL: z.url(),
  SMS_API_KEY: z.string().min(1),
  SMS_SENDER_ID: z.string().min(1),

  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8),
  ADMIN_NAME: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${problems}`);
}

export const env = parsed.data;
