import type { Prisma } from "../../generated/prisma/client";
import { HttpError } from "../../lib/httpError";
import { hasPinAccess } from "../../lib/pin";
import { prisma } from "../../lib/prisma";
import { storage } from "../../lib/storage";
import { publiclyVisiblePhoto } from "../photos/photos.service";

// Image links stay valid long enough for someone to browse the gallery for hours.
const IMAGE_URL_TTL_SECONDS = 6 * 60 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

const photoWithVariants = { variants: { where: { kind: { in: ["WEB", "THUMBNAIL"] } } } } satisfies Prisma.PhotoInclude;

type PhotoWithVariants = Prisma.PhotoGetPayload<{ include: typeof photoWithVariants }>;

async function imageUrls(photo: PhotoWithVariants) {
  const web = photo.variants.find((variant) => variant.kind === "WEB");
  const thumbnail = photo.variants.find((variant) => variant.kind === "THUMBNAIL");
  if (!web || !thumbnail) return null; // not fully processed: leave it out

  const [webUrl, thumbnailUrl] = await Promise.all([
    storage.presignDownload({ key: web.objectKey, expiresInSeconds: IMAGE_URL_TTL_SECONDS }),
    storage.presignDownload({ key: thumbnail.objectKey, expiresInSeconds: IMAGE_URL_TTL_SECONDS }),
  ]);
  return { web: webUrl, thumbnail: thumbnailUrl };
}

// DRAFT events are invisible; PUBLISHED and ARCHIVED (read-only) ones are public.
export async function findPublicEvent(slug: string) {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      templateVersion: { include: { template: { select: { code: true, name: true } } } },
      coverPhoto: { include: photoWithVariants },
    },
  });
  // A draft that was archived without ever being published must stay hidden.
  const neverPublished = event?.status === "DRAFT" || (event?.status === "ARCHIVED" && event.publishedAt === null);
  if (!event || neverPublished) throw HttpError.notFound("Gallery not found");
  return event;
}

// What the PIN screen may show before the PIN is entered (never any photos).
const pinGate = (event: { slug: string; coupleNames: string; location: string; eventDate: Date }) => ({
  pinRequired: true,
  event: { slug: event.slug, coupleNames: event.coupleNames, location: event.location, eventDate: event.eventDate },
});

export async function getPublicGallery(slug: string, cookies: Record<string, unknown> | undefined) {
  const event = await findPublicEvent(slug);
  if (!(await hasPinAccess(event, cookies))) throw new HttpError(403, "This gallery is protected by a PIN", pinGate(event));

  const sections = await prisma.gallerySection.findMany({
    where: { eventId: event.id },
    orderBy: { position: "asc" },
    include: {
      blocks: {
        orderBy: { position: "asc" },
        include: {
          blockType: true,
          placements: {
            where: { photo: publiclyVisiblePhoto },
            orderBy: { slot: "asc" },
            include: {
              photo: {
                include: {
                  ...photoWithVariants,
                  uploadBatch: { select: { guest: { select: { displayName: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  const viewSections = (
    await Promise.all(
      sections.map(async (section) => {
        const blocks = (
          await Promise.all(
            section.blocks.map(async (block) => {
              const photos = (
                await Promise.all(
                  block.placements.map(async (placement) => {
                    const urls = await imageUrls(placement.photo);
                    if (!urls) return null;
                    return {
                      id: placement.photo.id,
                      width: placement.photo.width,
                      height: placement.photo.height,
                      caption: placement.captionOverride ?? placement.photo.caption,
                      // "Photo credit": the guest's name, when they gave one.
                      credit: placement.photo.uploadBatch?.guest.displayName ?? null,
                      crop: placement.crop,
                      urls,
                    };
                  }),
                )
              ).filter((photo) => photo !== null);

              // A block with fewer photos than its type needs would look broken, so it is left out.
              if (photos.length < block.blockType.minPhotos) return null;

              return {
                id: block.id,
                type: {
                  code: block.blockType.code,
                  name: block.blockType.name,
                  responsiveConfig: block.blockType.responsiveConfig,
                },
                settings: block.settings,
                photos,
              };
            }),
          )
        ).filter((block) => block !== null);

        if (blocks.length === 0) return null;
        return { id: section.id, title: section.title, subtitle: section.subtitle, blocks };
      }),
    )
  ).filter((section) => section !== null);

  const coverVisible =
    event.coverPhoto !== null &&
    event.coverPhoto.approvalStatus === "APPROVED" &&
    event.coverPhoto.processingStatus === "READY" &&
    event.coverPhoto.deletedAt === null;
  const coverUrls = coverVisible ? await imageUrls(event.coverPhoto!) : null;

  return {
    event: {
      slug: event.slug,
      title: event.title,
      coupleNames: event.coupleNames,
      brideName: event.brideName,
      groomName: event.groomName,
      location: event.location,
      venue: event.venue,
      eventDate: event.eventDate,
      timezone: event.timezone,
      welcomeMessage: event.welcomeMessage,
      // introQuote, introText, closingTitle, closingText (each optional)
      content: event.content,
      pinProtected: event.accessPin !== null,
      status: event.status,
      // Archived galleries stay viewable but nothing new can be added.
      readOnly: event.status === "ARCHIVED",
      canDownload: event.allowViewerDownload,
      cover: coverUrls && { id: event.coverPhoto!.id, width: event.coverPhoto!.width, height: event.coverPhoto!.height, urls: coverUrls },
    },
    template: { code: event.templateVersion.template.code, name: event.templateVersion.template.name, version: event.templateVersion.version },
    // Template defaults, overridden by whatever the host customised.
    theme: {
      ...(event.templateVersion.themeDefaults as Record<string, unknown>),
      ...((event.themeOverrides as Record<string, unknown> | null) ?? {}),
    },
    sections: viewSections,
  };
}

// Only available when the host switched viewer downloads on. Gives the web-size image as a file.
export async function getPublicDownloadUrl(slug: string, photoId: string, cookies: Record<string, unknown> | undefined) {
  const event = await findPublicEvent(slug);
  if (!(await hasPinAccess(event, cookies))) throw new HttpError(403, "This gallery is protected by a PIN", pinGate(event));
  if (!event.allowViewerDownload) throw HttpError.forbidden("Downloads are turned off for this gallery");

  // Only photos that actually appear in the gallery can be downloaded.
  const photo = await prisma.photo.findFirst({
    where: { id: photoId, eventId: event.id, placements: { some: {} }, ...publiclyVisiblePhoto },
    include: { variants: { where: { kind: "WEB" } } },
  });
  const web = photo?.variants[0];
  if (!photo || !web) throw HttpError.notFound("Photo not found");

  const baseName = photo.originalFilename.replace(/\.[^.]+$/, "");
  return storage.presignDownload({
    key: web.objectKey,
    downloadName: `${baseName}.webp`,
    expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
  });
}
