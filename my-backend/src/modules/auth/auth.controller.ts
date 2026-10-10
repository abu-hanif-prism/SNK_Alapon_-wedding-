import type { CookieOptions, Response } from "express";
import { env } from "../../config/env";
import { asyncHandler } from "../../lib/asyncHandler";
import { HttpError } from "../../lib/httpError";
import * as authService from "./auth.service";
import * as phoneService from "./phone-verification.service";

const REFRESH_COOKIE = "refresh_token";

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/auth",
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

// The refresh token travels only in an httpOnly cookie; the body carries the access token.
function sendSession(res: Response, status: number, session: authService.Session) {
  res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions);
  res.status(status).json({
    success: true,
    data: { user: session.user, accessToken: session.accessToken },
  });
}

const readRefreshCookie = (cookies: Record<string, unknown> | undefined) => {
  const value = cookies?.[REFRESH_COOKIE];
  return typeof value === "string" && value.length > 0 ? value : null;
};

export const register = asyncHandler(async (req, res) => {
  sendSession(res, 201, await authService.register(req.body));
});

export const login = asyncHandler(async (req, res) => {
  sendSession(res, 200, await authService.login(req.body));
});

export const refresh = asyncHandler(async (req, res) => {
  const token = readRefreshCookie(req.cookies);
  if (!token) throw HttpError.unauthorized("Missing refresh token");
  sendSession(res, 200, await authService.refresh(token));
});

export const logout = asyncHandler(async (req, res) => {
  const token = readRefreshCookie(req.cookies);
  if (token) await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined });
  res.json({ success: true });
});

export const sendPhoneCode = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await phoneService.sendCode(req.auth!.userId) });
});

export const verifyPhone = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await phoneService.verifyCode(req.auth!.userId, req.body.code) });
});

export const changePhone = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await phoneService.changePhone(req.auth!.userId, req.body.phone) });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.auth!.userId);
  res.json({ success: true, data: { user } });
});
