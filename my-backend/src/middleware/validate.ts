import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { HttpError } from "../lib/httpError";

type Source = "body" | "query" | "params";

// Validates req[source] and replaces body/params with the parsed value.
// (Express 5 makes req.query read-only, so parsed query is stored on res.locals.query.)
export const validate =
  (schema: ZodType, source: Source = "body"): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(HttpError.badRequest("Validation failed", result.error.issues));
    }

    if (source === "query") {
      res.locals["query"] = result.data;
    } else {
      req[source] = result.data as never;
    }
    next();
  };
