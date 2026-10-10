import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import * as controller from "./auth.controller";
import { loginSchema, registerSchema, updatePhoneSchema, verifyPhoneSchema } from "./auth.schema";

// Brute-force protection for credential endpoints.
const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, try again later" },
});

export const authRouter = Router();

authRouter.post("/register", credentialsLimiter, validate(registerSchema), controller.register);
authRouter.post("/login", credentialsLimiter, validate(loginSchema), controller.login);
authRouter.post("/refresh", controller.refresh);
authRouter.post("/logout", controller.logout);
authRouter.get("/me", authenticate, controller.me);

// Mobile number verification (6-digit code by SMS).
authRouter.post("/phone/send-code", authenticate, controller.sendPhoneCode);
authRouter.post("/phone/verify", authenticate, validate(verifyPhoneSchema), controller.verifyPhone);
authRouter.patch("/phone", authenticate, validate(updatePhoneSchema), controller.changePhone);
