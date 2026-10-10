import type { ErrorRequestHandler, RequestHandler } from "express";
import { env } from "../config/env";
import { HttpError } from "../lib/httpError";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(HttpError.notFound(`Route not found: ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      success: false,
      message: error.message,
      ...(error.details !== undefined && { details: error.details }),
    });
    return;
  }

  // Errors raised by express itself (malformed JSON, body too large, ...) carry their own 4xx status.
  const clientError = error as { status?: unknown; type?: unknown; expose?: unknown };
  if (typeof clientError.status === "number" && clientError.status >= 400 && clientError.status < 500 && clientError.expose) {
    res.status(clientError.status).json({
      success: false,
      message: clientError.type === "entity.parse.failed" ? "Request body is not valid JSON" : "Invalid request",
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(env.NODE_ENV !== "production" && { error: String(error) }),
  });
};
