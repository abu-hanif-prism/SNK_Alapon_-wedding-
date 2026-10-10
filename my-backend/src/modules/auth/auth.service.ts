import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/httpError";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "../../lib/password";
import { generateOpaqueToken, hashToken, signAccessToken } from "../../lib/tokens";
import type { LoginInput, RegisterInput } from "./auth.schema";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  phoneVerifiedAt: true,
  role: true,
  status: true,
} as const;

type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  phoneVerifiedAt: Date | null;
  role: "ADMIN" | "HOST";
  status: "ACTIVE" | "SUSPENDED";
};

export type Session = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
};

async function issueSession(user: PublicUser): Promise<Session> {
  const refreshToken = generateOpaqueToken();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  const accessToken = await signAccessToken({ userId: user.id, role: user.role });

  return { user, accessToken, refreshToken };
}

export async function register(input: RegisterInput): Promise<Session> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw HttpError.conflict("Email is already registered");

  if (await prisma.user.findFirst({ where: { phone: input.phone }, select: { id: true } })) {
    throw HttpError.conflict("This mobile number is already registered");
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      role: "HOST",
    },
    select: publicUserSelect,
  });

  return issueSession(user);
}

export async function login(input: LoginInput): Promise<Session> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Same work whether or not the email exists, so timing doesn't reveal accounts.
  const passwordOk = await verifyPassword(user?.passwordHash ?? DUMMY_PASSWORD_HASH, input.password);

  if (!user || !passwordOk) throw HttpError.unauthorized("Invalid email or password");
  if (user.status !== "ACTIVE") throw HttpError.forbidden("Account is suspended");

  const { passwordHash: _omit, emailVerifiedAt: _e, createdAt: _c, updatedAt: _u, ...publicUser } = user;
  return issueSession(publicUser);
}

// Rotates the refresh token. Presenting an already-revoked token means it was
// stolen or replayed, so every session of that user is revoked.
export async function refresh(rawToken: string): Promise<Session> {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: { select: { ...publicUserSelect } } },
  });

  if (!record) throw HttpError.unauthorized("Invalid refresh token");

  if (record.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw HttpError.unauthorized("Refresh token was already used");
  }

  if (record.expiresAt < new Date()) throw HttpError.unauthorized("Refresh token expired");
  if (record.user.status !== "ACTIVE") throw HttpError.forbidden("Account is suspended");

  // Only one concurrent request may win the rotation.
  const revoked = await prisma.refreshToken.updateMany({
    where: { id: record.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (revoked.count === 0) throw HttpError.unauthorized("Refresh token was already used");

  return issueSession(record.user);
}

export async function logout(rawToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) throw HttpError.unauthorized("User no longer exists");
  return user;
}
