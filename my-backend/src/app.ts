import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { adminEventsRouter, eventsRouter } from "./modules/events/events.routes";
import { guestsRouter } from "./modules/guests/guests.routes";
import { MOCK_STORAGE_MOUNT, mockStorageRouter } from "./modules/storage-mock/storage-mock.routes";
import { guestUploadsRouter } from "./modules/uploads/uploads.routes";
import { publicRouter } from "./modules/public/public.routes";
import { adminPaymentsRouter, paymentsRouter } from "./modules/payments/payments.routes";
import { adminBlockTypesRouter, adminTemplatesRouter, blockTypesRouter, templatesRouter } from "./modules/templates/templates.routes";
import { adminPlansRouter, plansRouter } from "./modules/plans/plans.routes";
import { adminSubscriptionsRouter, subscriptionsRouter } from "./modules/subscriptions/subscriptions.routes";

const app = express();

// BigInt columns (storage sizes) are sent as strings; JSON can't carry BigInt.
app.set("json replacer", (_key: string, value: unknown) => (typeof value === "bigint" ? value.toString() : value));

if (env.TRUST_PROXY > 0) app.set("trust proxy", env.TRUST_PROXY);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));

// Read JSON bodies and cookies sent to your API
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Backstop against floods; the sensitive routes have their own, tighter limits.
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 1500,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, slow down" },
  }),
);

// A simple route to check the server
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "SNK Alapon backend is running",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/plans", plansRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/payments", paymentsRouter);

app.use("/api/templates", templatesRouter);
app.use("/api/block-types", blockTypesRouter);
app.use("/api/events", eventsRouter);
app.use("/api/u", guestsRouter);
app.use("/api/public", publicRouter);
app.use("/api/u", guestUploadsRouter);

// Local stand-in for S3: only exists in mock mode.
if (env.STORAGE_MODE === "mock") app.use(MOCK_STORAGE_MOUNT, mockStorageRouter);

app.use("/api/admin/templates", adminTemplatesRouter);
app.use("/api/admin/block-types", adminBlockTypesRouter);
app.use("/api/admin/events", adminEventsRouter);
app.use("/api/admin/plans", adminPlansRouter);
app.use("/api/admin", adminRouter);
app.use("/api/admin/subscriptions", adminSubscriptionsRouter);
app.use("/api/admin/payments", adminPaymentsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
