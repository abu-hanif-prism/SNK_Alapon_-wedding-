import { describe, expect, it } from "vitest";
import { maskPhone, normalizeBdPhone } from "../../src/lib/phone";
import {
  clearPinFailures,
  hasPinAccess,
  pinCookieName,
  pinLockedFor,
  pinMatches,
  recordPinFailure,
  signPinAccess,
} from "../../src/lib/pin";
import { decryptSecret, encryptSecret } from "../../src/lib/secretBox";

describe("normalizeBdPhone", () => {
  it("accepts the ways people type a Bangladesh mobile number", () => {
    for (const input of ["01712345678", "1712345678", "+8801712345678", "8801712345678", "01712-345 678", " +880 1712 345678 "]) {
      expect(normalizeBdPhone(input)).toBe("+8801712345678");
    }
  });

  it("covers every operator prefix 013-019", () => {
    for (const prefix of ["013", "014", "015", "016", "017", "018", "019"]) {
      expect(normalizeBdPhone(`${prefix}12345678`)).toBe(`+880${prefix.slice(1)}12345678`);
    }
  });

  it("rejects anything else", () => {
    for (const bad of ["", "12345", "01212345678", "0171234567", "017123456789", "+14155550123", "abcdefghijk"]) {
      expect(normalizeBdPhone(bad)).toBeNull();
    }
  });

  it("masks the middle digits", () => {
    expect(maskPhone("+8801712345678")).toBe("+880171•••678");
  });
});

describe("secret box", () => {
  it("round-trips text and never repeats the same ciphertext", () => {
    const sealed = encryptSecret("upload-token-abc");
    expect(sealed).not.toContain("upload-token-abc");
    expect(decryptSecret(sealed)).toBe("upload-token-abc");
    expect(encryptSecret("upload-token-abc")).not.toBe(sealed);
  });

  it("returns null for tampered or malformed values", () => {
    const sealed = encryptSecret("hello");
    const [iv, tag, data] = sealed.split(".");
    expect(decryptSecret(`${iv}.${tag}.${Buffer.from("tampered").toString("base64url")}`)).toBeNull();
    expect(decryptSecret(`${iv}.${tag}`)).toBeNull();
    expect(decryptSecret("nonsense")).toBeNull();
    expect(data).toBeTruthy();
  });
});

describe("event PIN", () => {
  const event = { id: "11111111-1111-4111-8111-111111111111", accessPin: "2026" };
  const cookieFor = async (pin: string) => ({ [pinCookieName(event.id)]: await signPinAccess(event.id, pin) });

  it("compares PINs exactly", () => {
    expect(pinMatches("2026", "2026")).toBe(true);
    expect(pinMatches("2026", "2027")).toBe(false);
    expect(pinMatches("2026", "202")).toBe(false);
  });

  it("lets everyone in when there is no PIN", async () => {
    expect(await hasPinAccess({ id: event.id, accessPin: null }, undefined)).toBe(true);
  });

  it("needs the cookie issued for the current PIN", async () => {
    expect(await hasPinAccess(event, undefined)).toBe(false);
    expect(await hasPinAccess(event, { [pinCookieName(event.id)]: "garbage" })).toBe(false);
    expect(await hasPinAccess(event, await cookieFor("2026"))).toBe(true);
  });

  it("stops working when the host changes the PIN", async () => {
    const cookies = await cookieFor("2026");
    expect(await hasPinAccess({ ...event, accessPin: "9999" }, cookies)).toBe(false);
  });

  it("does not work for another event", async () => {
    const cookies = await cookieFor("2026");
    const other = { id: "22222222-2222-4222-8222-222222222222", accessPin: "2026" };
    expect(await hasPinAccess(other, { [pinCookieName(other.id)]: cookies[pinCookieName(event.id)] })).toBe(false);
  });

  it("locks out after five wrong guesses and can be cleared", () => {
    const key = `unit:${Math.random()}`;
    expect(pinLockedFor(key)).toBe(0);
    expect([1, 2, 3, 4, 5].map(() => recordPinFailure(key))).toEqual([4, 3, 2, 1, 0]);
    expect(pinLockedFor(key)).toBeGreaterThan(0);
    clearPinFailures(key);
    expect(pinLockedFor(key)).toBe(0);
  });
});
