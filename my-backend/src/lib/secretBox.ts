import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../config/env";

// Reversible encryption (AES-256-GCM) for the few values we must be able to show again,
// such as an event's upload link token. The key is derived from JWT_REFRESH_SECRET with a
// fixed label, so there is no extra secret to manage; rotating that secret makes old values unreadable.
const key = createHash("sha256").update(`snk-secret-box:${env.JWT_REFRESH_SECRET}`).digest();

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
}

// Returns null when the value is malformed or was encrypted with another key.
export function decryptSecret(sealed: string): string | null {
  try {
    const [iv, tag, data] = sealed.split(".").map((part) => Buffer.from(part, "base64url"));
    if (!iv || !tag || !data) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
