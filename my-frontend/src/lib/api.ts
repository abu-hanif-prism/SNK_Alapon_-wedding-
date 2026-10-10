import type { User } from "./types";
export const API = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
let accessToken: string | null = null;
let refreshing: Promise<{ user: User; accessToken: string }> | null = null;
export function refreshSession() {
  if (!refreshing)
    refreshing = request<{ user: User; accessToken: string }>(
      "/auth/refresh",
      "POST",
      undefined,
      false,
    )
      .then((d) => {
        setToken(d.accessToken);
        return d;
      })
      .finally(() => {
        refreshing = null;
      });
  return refreshing;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}
export function setToken(token: string | null) {
  accessToken = token;
}
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  authenticated = true,
): Promise<T> {
  async function send() {
    return fetch(`${API}${path}`, {
      method,
      credentials: "include",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(authenticated && accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }
  let response: Response;
  try {
    response = await send();
  } catch {
    throw new ApiError(
      "Unable to reach the server. Check your connection and try again.",
      0,
    );
  }
  if (
    response.status === 401 &&
    authenticated &&
    ![
      "/auth/refresh",
      "/auth/login",
      "/auth/register",
      "/auth/logout",
    ].includes(path)
  ) {
    await refreshSession();
    response = await send();
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false)
    throw new ApiError(
      result.message || "Something went wrong. Please try again.",
      response.status,
      result.details,
    );
  return result.data as T;
}
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";
export function safeUrl(value: string) {
  const url = new URL(
    value,
    typeof location === "undefined" ? "http://localhost" : location.origin,
  );
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Invalid link");
  return url.href;
}
export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}
