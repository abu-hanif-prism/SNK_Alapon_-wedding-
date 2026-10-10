import type { Request, Response } from "express";
import { HttpError } from "./httpError";
import {
  clearPinFailures,
  pinCookieName,
  pinCookieOptions,
  pinLockedFor,
  pinMatches,
  recordPinFailure,
  signPinAccess,
} from "./pin";

// Shared by the public viewer and the guest upload page: checks a submitted PIN and, if right,
// sets the access cookie for that event.
export async function unlockWithPin(
  req: Request,
  res: Response,
  event: { id: string; accessPin: string | null },
  submittedPin: string,
) {
  if (event.accessPin === null) return; // nothing to unlock

  const key = `${event.id}:${req.ip ?? "unknown"}`;

  const lockedFor = pinLockedFor(key);
  if (lockedFor > 0) {
    throw new HttpError(429, "Too many wrong PINs. Please try again later.", { retryAfterSeconds: lockedFor });
  }

  if (!pinMatches(event.accessPin, submittedPin)) {
    const attemptsRemaining = recordPinFailure(key);
    throw new HttpError(401, "Incorrect PIN", { attemptsRemaining });
  }

  clearPinFailures(key);
  res.cookie(pinCookieName(event.id), await signPinAccess(event.id, event.accessPin), pinCookieOptions);
}
