import { createHash, randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { env } from "../config/env";
import type { UserRole } from "../generated/prisma/enums";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export type AccessTokenPayload = {
  userId: string;
  role: UserRole;
};

export const signAccessToken = ({ userId, role }: AccessTokenPayload) =>
  new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(accessSecret);

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret, { algorithms: ["HS256"] });

  if (!payload.sub || (payload["role"] !== "ADMIN" && payload["role"] !== "HOST")) {
    throw new Error("Malformed access token");
  }

  return { userId: payload.sub, role: payload["role"] };
}

// Opaque random token for refresh tokens / upload links. Only its hash is stored.
export const generateOpaqueToken = () => randomBytes(32).toString("base64url");

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
