import { randomInt } from "node:crypto";
import { env } from "../../config/env";
import { HttpError } from "../../lib/httpError";
import { maskPhone } from "../../lib/phone";
import { prisma } from "../../lib/prisma";
import { sendSms } from "../../lib/sms";
import { hashToken } from "../../lib/tokens";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

// Hashed together with the user id, so a code is useless for any other account.
const hashCode = (userId: string, code: string) => hashToken(`${userId}:${code}`);

async function requireUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw HttpError.unauthorized("User no longer exists");
  if (!user.phone) throw HttpError.badRequest("Add a mobile number first");
  return { ...user, phone: user.phone };
}

export async function sendCode(userId: string) {
  const user = await requireUser(userId);
  if (user.phoneVerifiedAt) throw HttpError.conflict("This mobile number is already verified");

  const recent = await prisma.phoneVerification.findMany({
    where: { userId, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const last = recent[0];
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new HttpError(429, "Please wait a moment before asking for another code");
  }
  if (recent.length >= MAX_SENDS_PER_HOUR) {
    throw new HttpError(429, "Too many codes requested. Try again in an hour");
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await prisma.phoneVerification.create({
    data: { userId, phone: user.phone, codeHash: hashCode(userId, code), expiresAt },
  });

  try {
    await sendSms(user.phone, `Your SnapNKeep verification code is ${code}. It expires in 10 minutes.`);
  } catch (error) {
    console.error("Sending verification SMS failed:", error);
    throw new HttpError(502, "We could not send the SMS. Please try again.");
  }

  return {
    phone: maskPhone(user.phone),
    expiresAt,
    // Lets developers finish onboarding without a real SMS gateway. Never returned in production.
    ...(env.SMS_MODE === "mock" && env.NODE_ENV !== "production" && { devCode: code }),
  };
}

export async function verifyCode(userId: string, code: string) {
  const user = await requireUser(userId);
  if (user.phoneVerifiedAt) return { verified: true as const };

  // Only the newest code for the current number counts.
  const verification = await prisma.phoneVerification.findFirst({
    where: { userId, phone: user.phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!verification) throw HttpError.badRequest("This code has expired. Ask for a new one.");

  if (verification.attempts >= MAX_ATTEMPTS) {
    throw new HttpError(429, "Too many wrong attempts. Ask for a new code.");
  }

  if (verification.codeHash !== hashCode(userId, code)) {
    const updated = await prisma.phoneVerification.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });
    throw new HttpError(400, "That code doesn't match. Please try again.", {
      attemptsRemaining: Math.max(0, MAX_ATTEMPTS - updated.attempts),
    });
  }

  await prisma.$transaction([
    prisma.phoneVerification.update({ where: { id: verification.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { phoneVerifiedAt: new Date() } }),
  ]);

  return { verified: true as const };
}

// "Edit mobile number": changing the number means it has to be verified again.
export async function changePhone(userId: string, phone: string) {
  const taken = await prisma.user.findFirst({ where: { phone, id: { not: userId } }, select: { id: true } });
  if (taken) throw HttpError.conflict("This mobile number is already registered");

  await prisma.user.update({ where: { id: userId }, data: { phone, phoneVerifiedAt: null } });
  return { phone };
}
