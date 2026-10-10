import sharp from "sharp";
import { prisma } from "../lib/prisma";
import { storage } from "../lib/storage";
import { variantKeyFor } from "../lib/uploadRules";

// Turns each uploaded original into a WEB and a THUMBNAIL variant (WebP, EXIF rotation applied,
// metadata such as GPS stripped). Work is claimed straight from the photos table with
// FOR UPDATE SKIP LOCKED, so it survives restarts and several server instances are safe.

const POLL_INTERVAL_MS = 3_000;
const CONCURRENCY = 2;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_SECONDS = 30;
const STALE_AFTER_MINUTES = 10;
const MAX_INPUT_PIXELS = 80_000_000;

const WEB_MAX_SIDE = 2000;
const THUMB_MAX_SIDE = 400;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

type ClaimedPhoto = {
  id: string;
  eventId: string;
  originalObjectKey: string;
  processingAttempts: number;
};

// Retrying cannot help (the file itself is bad).
class UnprocessableImageError extends Error {}

let enabled = false;
let running = false;
let rerun = false;

async function claim(limit: number): Promise<ClaimedPhoto[]> {
  // Only photos whose upload is finished: host uploads, or guest uploads whose batch is COMPLETED.
  return prisma.$queryRaw<ClaimedPhoto[]>`
    UPDATE photos
    SET "processingStatus" = 'PROCESSING',
        "processingStartedAt" = now(),
        "processingAttempts" = "processingAttempts" + 1
    WHERE id IN (
      SELECT p.id
      FROM photos p
      LEFT JOIN upload_batches b ON b.id = p."uploadBatchId"
      WHERE p."processingStatus" = 'PENDING'
        AND p."deletedAt" IS NULL
        AND (p."uploadedByHostId" IS NOT NULL OR b.status = 'COMPLETED')
        AND (p."processingStartedAt" IS NULL
             OR p."processingStartedAt" < now() - make_interval(secs => ${RETRY_DELAY_SECONDS}))
      ORDER BY p."createdAt"
      LIMIT ${limit}
      FOR UPDATE OF p SKIP LOCKED
    )
    RETURNING id, "eventId", "originalObjectKey", "processingAttempts"`;
}

// A worker that died mid-job leaves photos stuck in PROCESSING; put them back in the queue.
async function recoverStale() {
  await prisma.$executeRaw`
    UPDATE photos
    SET "processingStatus" = CASE WHEN "processingAttempts" >= ${MAX_ATTEMPTS}
                                  THEN 'FAILED'::"ProcessingStatus" ELSE 'PENDING'::"ProcessingStatus" END,
        "processingError" = 'Processing timed out'
    WHERE "processingStatus" = 'PROCESSING'
      AND "processingStartedAt" < now() - make_interval(mins => ${STALE_AFTER_MINUTES})`;
}

async function renderVariants(original: Buffer) {
  const probe = sharp(original, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" });
  const meta = await probe.metadata();

  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format) || !meta.width || !meta.height) {
    throw new UnprocessableImageError("Unsupported or unreadable image");
  }

  // EXIF orientations 5-8 are rotated by 90 degrees, so width and height swap.
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;

  const render = (side: number, quality: number) =>
    sharp(original, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
      .rotate()
      .resize({ width: side, height: side, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });

  const [web, thumbnail] = await Promise.all([render(WEB_MAX_SIDE, 82), render(THUMB_MAX_SIDE, 75)]);
  return { width, height, web, thumbnail };
}

async function processOne(photo: ClaimedPhoto) {
  try {
    const original = await storage.getObject(photo.originalObjectKey);

    let rendered: Awaited<ReturnType<typeof renderVariants>>;
    try {
      rendered = await renderVariants(original);
    } catch (error) {
      if (error instanceof UnprocessableImageError) throw error;
      throw new UnprocessableImageError(`Could not decode image: ${String(error).slice(0, 200)}`);
    }

    const variants = [
      { kind: "WEB" as const, key: variantKeyFor(photo.eventId, photo.id, "web"), result: rendered.web },
      { kind: "THUMBNAIL" as const, key: variantKeyFor(photo.eventId, photo.id, "thumbnail"), result: rendered.thumbnail },
    ];

    for (const variant of variants) {
      await storage.putObject(variant.key, variant.result.data, "image/webp");
    }

    await prisma.$transaction([
      ...variants.map((variant) => {
        const data = {
          objectKey: variant.key,
          width: variant.result.info.width,
          height: variant.result.info.height,
          byteSize: BigInt(variant.result.info.size),
          mimeType: "image/webp",
        };
        return prisma.photoVariant.upsert({
          where: { photoId_kind: { photoId: photo.id, kind: variant.kind } },
          update: data,
          create: { photoId: photo.id, kind: variant.kind, ...data },
        });
      }),
      prisma.photo.update({
        where: { id: photo.id },
        data: { width: rendered.width, height: rendered.height, processingStatus: "READY", processingError: null },
      }),
    ]);
  } catch (error) {
    await recordFailure(photo, error);
  }
}

async function recordFailure(photo: ClaimedPhoto, error: unknown) {
  const permanent = error instanceof UnprocessableImageError || photo.processingAttempts >= MAX_ATTEMPTS;
  console.error(`Photo ${photo.id} processing failed (attempt ${photo.processingAttempts}):`, error);

  // updateMany: the photo may have been removed while we worked on it.
  await prisma.photo.updateMany({
    where: { id: photo.id, processingStatus: "PROCESSING" },
    data: { processingStatus: permanent ? "FAILED" : "PENDING", processingError: String(error).slice(0, 500) },
  });
}

async function tick() {
  if (!enabled) return;
  if (running) {
    rerun = true;
    return;
  }

  running = true;
  try {
    await recoverStale();
    do {
      rerun = false;
      for (;;) {
        const batch = await claim(CONCURRENCY);
        if (batch.length === 0) break;
        await Promise.all(batch.map(processOne));
      }
    } while (rerun);
  } catch (error) {
    console.error("Photo processor tick failed:", error);
  } finally {
    running = false;
  }
}

// Call after new photos become ready for processing, to start without waiting for the next poll.
export function requestProcessing() {
  void tick();
}

export function startPhotoProcessor() {
  enabled = true;
  const timer = setInterval(() => void tick(), POLL_INTERVAL_MS);
  void tick();

  return () => {
    enabled = false;
    clearInterval(timer);
  };
}
