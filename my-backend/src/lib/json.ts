import { Prisma } from "../generated/prisma/client";

// Prisma needs DbNull (not null) to write SQL NULL into a nullable Json column.
export const toNullableJson = (value: Record<string, unknown> | null) =>
  value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);

export const toJson = (value: unknown) => value as Prisma.InputJsonValue;

export const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
