import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "./httpError";

export function getParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string") throw HttpError.badRequest(`Missing parameter: ${name}`);
  return value;
}

// Validated query (see middleware/validate.ts) is stored on res.locals.
export const getQuery = <T>(res: Response): T => res.locals["query"] as T;

export const idParamSchema = z.object({ id: z.uuid() });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

export const toSkipTake = ({ page, limit }: Pagination) => ({ skip: (page - 1) * limit, take: limit });
