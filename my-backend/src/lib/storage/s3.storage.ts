import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env";
import type { Storage } from "./storage.types";

// Real AWS S3. NOTE: not yet exercised against a real bucket (the keys in .env are dummies).
// The bucket needs a CORS rule allowing PUT/GET from the frontend origin.

const UPLOAD_URL_TTL_SECONDS = 15 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60;

const client = new S3Client({
  region: env.AWS_REGION,
  credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY },
});

const isNotFound = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  ((error as { name?: string }).name === "NotFound" ||
    (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404);

export const s3Storage: Storage = {
  async presignUpload({ key, contentType, byteSize }) {
    // ContentLength is part of the signature, so S3 rejects a body of any other size.
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: byteSize,
    });
    const url = await getSignedUrl(client, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });

    return { url, method: "PUT", headers: { "Content-Type": contentType } };
  },

  presignDownload({ key, downloadName, expiresInSeconds }) {
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ...(downloadName && {
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(downloadName)}"`,
      }),
    });
    return getSignedUrl(client, command, { expiresIn: expiresInSeconds ?? DOWNLOAD_URL_TTL_SECONDS });
  },

  async head(key) {
    try {
      const result = await client.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
      return { size: result.ContentLength ?? 0, contentType: result.ContentType ?? null };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  },

  async getObject(key) {
    const result = await client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    if (!result.Body) throw new Error(`Empty S3 object: ${key}`);
    return Buffer.from(await result.Body.transformToByteArray());
  },

  async putObject(key, body, contentType) {
    await client.send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
  },

  async deleteObject(key) {
    await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  },
};
