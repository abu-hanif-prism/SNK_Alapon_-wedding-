import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env";
import type { Storage } from "./storage.types";

// Local-disk stand-in for S3 (STORAGE_MODE=mock). Signed URLs point back at this API
// (see modules/storage-mock), which enforces the same rules S3 would: valid signature,
// not expired, exact size and content type for uploads.

export const MOCK_STORAGE_ROOT = path.resolve(process.cwd(), ".storage");
export const MOCK_URL_PREFIX = "/api/mock-storage";

const KEY_PATTERN = /^[A-Za-z0-9/_.-]+$/;

export function assertSafeKey(key: string) {
  if (!KEY_PATTERN.test(key) || key.includes("..") || key.startsWith("/")) {
    throw new Error(`Unsafe storage key: ${key}`);
  }
}

export const filePathFor = (key: string) => {
  assertSafeKey(key);
  return path.join(MOCK_STORAGE_ROOT, ...key.split("/"));
};

const metaPathFor = (key: string) => `${filePathFor(key)}.meta.json`;

export type SignedParams = {
  method: "PUT" | "GET";
  key: string;
  expires: number; // unix seconds
  contentType?: string;
  byteSize?: number;
  downloadName?: string;
};

const canonical = (p: SignedParams) =>
  [p.method, p.key, p.expires, p.contentType ?? "", p.byteSize ?? "", p.downloadName ?? ""].join("\n");

const sign = (p: SignedParams) => createHmac("sha256", env.JWT_ACCESS_SECRET).update(canonical(p)).digest("hex");

export function verifySignature(p: SignedParams, signature: string): boolean {
  if (p.expires * 1000 < Date.now()) return false;
  const expected = Buffer.from(sign(p));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function buildUrl(p: SignedParams): string {
  const url = new URL(`${MOCK_URL_PREFIX}/${Buffer.from(p.key).toString("base64url")}`, env.API_BASE_URL);
  url.searchParams.set("expires", String(p.expires));
  if (p.contentType) url.searchParams.set("type", p.contentType);
  if (p.byteSize !== undefined) url.searchParams.set("size", String(p.byteSize));
  if (p.downloadName) url.searchParams.set("name", p.downloadName);
  url.searchParams.set("sig", sign(p));
  return url.toString();
}

export async function writeMockObject(key: string, body: Buffer, contentType: string) {
  const file = filePathFor(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
  await writeFile(metaPathFor(key), JSON.stringify({ contentType, size: body.length }));
}

export async function readMockObject(key: string): Promise<{ body: Buffer; contentType: string } | null> {
  try {
    const [body, meta] = await Promise.all([readFile(filePathFor(key)), readFile(metaPathFor(key), "utf8")]);
    return { body, contentType: (JSON.parse(meta) as { contentType: string }).contentType };
  } catch {
    return null;
  }
}

export const mockStorage: Storage = {
  async presignUpload({ key, contentType, byteSize }) {
    const expires = Math.floor(Date.now() / 1000) + 15 * 60;
    const url = buildUrl({ method: "PUT", key, expires, contentType, byteSize });
    return { url, method: "PUT", headers: { "Content-Type": contentType } };
  },

  async presignDownload({ key, downloadName, expiresInSeconds }) {
    const expires = Math.floor(Date.now() / 1000) + (expiresInSeconds ?? 60 * 60);
    return buildUrl({ method: "GET", key, expires, ...(downloadName && { downloadName }) });
  },

  async head(key) {
    try {
      const [info, meta] = await Promise.all([stat(filePathFor(key)), readFile(metaPathFor(key), "utf8")]);
      return { size: info.size, contentType: (JSON.parse(meta) as { contentType: string }).contentType };
    } catch {
      return null;
    }
  },

  async getObject(key) {
    return readFile(filePathFor(key));
  },

  async putObject(key, body, contentType) {
    await writeMockObject(key, body, contentType);
  },

  async deleteObject(key) {
    await Promise.all([rm(filePathFor(key), { force: true }), rm(metaPathFor(key), { force: true })]);
  },
};
