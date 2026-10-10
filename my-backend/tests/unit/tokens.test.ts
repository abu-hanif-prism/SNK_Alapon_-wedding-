import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { generateOpaqueToken, hashToken, signAccessToken, verifyAccessToken } from "../../src/lib/tokens";

const secret = () => new TextEncoder().encode(process.env["JWT_ACCESS_SECRET"]!);

describe("opaque tokens", () => {
  it("are long, URL-safe and unique", () => {
    const a = generateOpaqueToken();
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(generateOpaqueToken()).not.toBe(a);
  });

  it("hash to a stable 64-char hex digest that differs per input", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});

describe("access tokens", () => {
  it("round-trip the user id and role", async () => {
    const token = await signAccessToken({ userId: "user-1", role: "HOST" });
    expect(await verifyAccessToken(token)).toEqual({ userId: "user-1", role: "HOST" });
  });

  it("reject garbage and a forged payload", async () => {
    await expect(verifyAccessToken("not.a.jwt")).rejects.toThrow();

    const token = await signAccessToken({ userId: "user-1", role: "HOST" });
    const [header, , signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "user-1", role: "ADMIN" })).toString("base64url");
    await expect(verifyAccessToken(`${header}.${forged}.${signature}`)).rejects.toThrow();
  });

  it("reject tokens signed with another secret", async () => {
    const foreign = await new SignJWT({ role: "ADMIN" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode("a_completely_different_secret_of_32+_chars"));
    await expect(verifyAccessToken(foreign)).rejects.toThrow();
  });

  it("reject a validly signed token with an unknown role", async () => {
    const odd = await new SignJWT({ role: "SUPERUSER" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setExpirationTime("15m")
      .sign(secret());
    await expect(verifyAccessToken(odd)).rejects.toThrow();
  });

  it("reject expired tokens", async () => {
    const expired = await new SignJWT({ role: "HOST" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret());
    await expect(verifyAccessToken(expired)).rejects.toThrow();
  });
});
