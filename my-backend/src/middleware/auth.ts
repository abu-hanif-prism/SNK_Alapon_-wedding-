import type { RequestHandler } from "express";
import type { UserRole } from "../generated/prisma/enums";
import { HttpError } from "../lib/httpError";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/tokens";

declare module "express-serve-static-core" {
  interface Request {
    auth?: AccessTokenPayload;
  }
}

export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next(HttpError.unauthorized("Missing access token"));
  }

  try {
    req.auth = await verifyAccessToken(header.slice("Bearer ".length));
    next();
  } catch {
    next(HttpError.unauthorized("Invalid or expired access token"));
  }
};

export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) return next(HttpError.unauthorized());
    if (!roles.includes(req.auth.role)) return next(HttpError.forbidden());
    next();
  };
