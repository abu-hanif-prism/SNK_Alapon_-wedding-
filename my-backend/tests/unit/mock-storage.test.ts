import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { assertSafeKey, mockStorage, verifySignature, type SignedParams } from "../../src/lib/storage/mock.storage";

const created: string[] = [];
const newKey = () => {
  const key = `tests/unit-${randomBytes(6).toString("hex")}.bin`;
  created.push(key);
  return key;
};

afterAll(async () => {
  await Promise.all(created.map((key) => mockStorage.deleteObject(key)));
});

function parse(url: string): { params: SignedParams; signature: string } {
  const u = new URL(url);
  const key = Buffer.from(u.pathname.split("/").pop()!, "base64url").toString("utf8");
  const get = (name: string) => u.searchParams.get(name) ?? undefined;

  const params: SignedParams = {
    method: u.searchParams.has("type") ? "PUT" : "GET",
    key,
    expires: Number(get("expires")),
    ...(get("type") && { contentType: get("type")! }),
    ...(get("size") && { byteSize: Number(get("size")) }),
    ...(get("name") && { downloadName: get("name")! }),
  };
  return { params, signature: get("sig")! };
}

describe("mock storage keys", () => {
  it("accepts normal keys and refuses anything that could escape the folder", () => {
    expect(() => assertSafeKey("events/e1/originals/p1.jpg")).not.toThrow();
    for (const bad of ["../x", "a/../b", "/abs", "a b", "a\\b", "a%2e%2e/b"]) {
      expect(() => assertSafeKey(bad)).toThrow();
    }
  });
});

describe("mock storage signatures", () => {
  it("verify for the exact parameters that were signed", async () => {
    const presigned = await mockStorage.presignUpload({ key: newKey(), contentType: "image/jpeg", byteSize: 1234 });
    const { params, signature } = parse(presigned.url);

    expect(presigned.method).toBe("PUT");
    expect(presigned.headers).toEqual({ "Content-Type": "image/jpeg" });
    expect(verifySignature(params, signature)).toBe(true);
  });

  it("fail when the size, type, key or signature is changed", async () => {
    const presigned = await mockStorage.presignUpload({ key: newKey(), contentType: "image/jpeg", byteSize: 1234 });
    const { params, signature } = parse(presigned.url);

    expect(verifySignature({ ...params, byteSize: 9999 }, signature)).toBe(false);
    expect(verifySignature({ ...params, contentType: "image/png" }, signature)).toBe(false);
    expect(verifySignature({ ...params, key: "events/other.jpg" }, signature)).toBe(false);
    expect(verifySignature(params, "0".repeat(64))).toBe(false);
    expect(verifySignature(params, "short")).toBe(false);
  });

  it("fail once expired", async () => {
    const { params, signature } = parse(await mockStorage.presignDownload({ key: newKey(), expiresInSeconds: 60 }));

    expect(verifySignature(params, signature)).toBe(true);
    expect(verifySignature({ ...params, expires: Math.floor(Date.now() / 1000) - 1 }, signature)).toBe(false);
  });

  it("cannot be reused as a different method", async () => {
    const { params, signature } = parse(await mockStorage.presignDownload({ key: newKey() }));
    expect(verifySignature({ ...params, method: "PUT" }, signature)).toBe(false);
  });
});

describe("mock storage objects", () => {
  it("round-trips bytes and reports size and type", async () => {
    const key = newKey();
    const body = randomBytes(2048);

    expect(await mockStorage.head(key)).toBeNull();
    await mockStorage.putObject(key, body, "application/octet-stream");

    expect(await mockStorage.head(key)).toEqual({ size: 2048, contentType: "application/octet-stream" });
    expect(Buffer.compare(await mockStorage.getObject(key), body)).toBe(0);

    await mockStorage.deleteObject(key);
    expect(await mockStorage.head(key)).toBeNull();
  });
});
