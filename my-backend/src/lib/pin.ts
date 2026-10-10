import { createHmac, timingSafeEqual } from "node:crypto";
import type { CookieOptions } from "express";
import { jwtVerify, SignJWT } from "jose";
import { env } from "../config/env";

// Optional 4-digit event PIN. Once a visitor enters it correctly they get a signed cookie that is
// valid for that event until the host changes the PIN. A 4-digit PIN is a gate against casual visitors
// (it is printed on the invitation cards), not a strong secret, so wrong guesses are rate limited.

const secret = new TextEncoder().encode(`event-pin:${env.JWT_ACCESS_SECRET}`);
const ACCESS_DAYS = 30;

export const pinCookieName = (eventId: string) => `pin_${eventId}`;

export const pinCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api",
  maxAge: ACCESS_DAYS * 24 * 60 * 60 * 1000,
};

// Changing the PIN changes the fingerprint, which invalidates every cookie issued for the old one.
const fingerprint = (pin: string) => createHmac("sha256", secret).update(pin).digest("hex").slice(0, 16);

export const signPinAccess = (eventId: string, pin: string) =>
  new SignJWT({ fp: fingerprint(pin) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(eventId)
    .setExpirationTime(`${ACCESS_DAYS}d`)
    .sign(secret);

export async function hasPinAccess(
  event: { id: string; accessPin: string | null },
  cookies: Record<string, unknown> | undefined,
): Promise<boolean> {
  if (event.accessPin === null) return true;

  const token = cookies?.[pinCookieName(event.id)];
  if (typeof token !== "string") return false;

  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return payload.sub === event.id && payload["fp"] === fingerprint(event.accessPin);
  } catch {
    return false;
  }
}

export function pinMatches(expected: string, given: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

// --- wrong-guess limiter: 5 tries per visitor per event, then a 15 minute lockout (in memory) ---

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

function current(key: string) {
  const entry = failures.get(key);
  if (entry && entry.resetAt <= Date.now()) {
    failures.delete(key);
    return undefined;
  }
  return entry;
}

export function pinLockedFor(key: string): number {
  const entry = current(key);
  return entry && entry.count >= MAX_FAILURES ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 0;
}

// Returns how many tries are left after this failure.
export function recordPinFailure(key: string): number {
  if (failures.size > 10_000) {
    for (const k of failures.keys()) current(k); // drop expired entries
  }
  const entry = current(key) ?? { count: 0, resetAt: Date.now() + LOCKOUT_MS };
  entry.count++;
  failures.set(key, entry);
  return Math.max(0, MAX_FAILURES - entry.count);
}

export const clearPinFailures = (key: string) => failures.delete(key);
