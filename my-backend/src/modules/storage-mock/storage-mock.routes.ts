import { Router } from "express";
import express from "express";
import {
  MOCK_URL_PREFIX,
  assertSafeKey,
  readMockObject,
  verifySignature,
  writeMockObject,
  type SignedParams,
} from "../../lib/storage/mock.storage";
import { HttpError } from "../../lib/httpError";
import { asyncHandler } from "../../lib/asyncHandler";

// Only mounted when STORAGE_MODE=mock. Behaves like the S3 endpoints the presigned URLs would hit.
export const MOCK_STORAGE_MOUNT = MOCK_URL_PREFIX;
const MAX_BODY_BYTES = 30 * 1024 * 1024;

export const mockStorageRouter = Router();

function decodeKey(encoded: string): string {
  const key = Buffer.from(encoded, "base64url").toString("utf8");
  try {
    assertSafeKey(key);
  } catch {
    throw HttpError.badRequest("Invalid key");
  }
  return key;
}

const str = (value: unknown) => (typeof value === "string" ? value : undefined);

mockStorageRouter.put(
  "/:encodedKey",
  express.raw({ type: () => true, limit: MAX_BODY_BYTES }),
  asyncHandler(async (req, res) => {
    const key = decodeKey(String(req.params["encodedKey"]));
    const contentType = str(req.query["type"]);
    const byteSize = Number(str(req.query["size"]));

    const params: SignedParams = {
      method: "PUT",
      key,
      expires: Number(str(req.query["expires"])),
      ...(contentType && { contentType }),
      byteSize,
    };
    if (!verifySignature(params, str(req.query["sig"]) ?? "")) throw HttpError.forbidden("Invalid or expired signature");

    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (body.length !== byteSize) throw HttpError.badRequest("Body size does not match the signed size");
    if (req.headers["content-type"] !== contentType) throw HttpError.badRequest("Content-Type does not match the signed type");

    await writeMockObject(key, body, contentType ?? "application/octet-stream");
    res.status(200).end();
  }),
);

mockStorageRouter.get(
  "/:encodedKey",
  asyncHandler(async (req, res) => {
    const key = decodeKey(String(req.params["encodedKey"]));
    const downloadName = str(req.query["name"]);

    const params: SignedParams = {
      method: "GET",
      key,
      expires: Number(str(req.query["expires"])),
      ...(downloadName && { downloadName }),
    };
    if (!verifySignature(params, str(req.query["sig"]) ?? "")) throw HttpError.forbidden("Invalid or expired signature");

    const object = await readMockObject(key);
    if (!object) throw HttpError.notFound("Object not found");

    res.setHeader("Content-Type", object.contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"); // frontend runs on another origin
    if (downloadName) res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(downloadName)}"`);
    res.send(object.body);
  }),
);
