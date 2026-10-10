/*
  Warnings:

  - The `status` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('APPROVE', 'REJECT', 'RESTORE', 'DELETE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('BKASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UploadBatchStatus" AS ENUM ('RESERVED', 'COMPLETED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PhotoVariantKind" AS ENUM ('WEB', 'THUMBNAIL');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerifiedAt" TIMESTAMPTZ(3),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "moderation_logs" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "photoId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" "ModerationAction" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "edition" INTEGER NOT NULL,
    "maxEvents" INTEGER NOT NULL,
    "storageLimitBytes" BIGINT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "billingPeriod" "BillingPeriod" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "hostId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "startsAt" TIMESTAMPTZ(3),
    "endsAt" TIMESTAMPTZ(3),
    "edition" INTEGER NOT NULL,
    "maxEvents" INTEGER NOT NULL,
    "storageLimitBytes" BIGINT NOT NULL,
    "usedBytes" BIGINT NOT NULL DEFAULT 0,
    "pricePaid" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'BKASH',
    "invoiceNumber" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "trxId" TEXT,
    "payerMsisdn" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "providerResponse" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMPTZ(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "hostId" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "templateVersionId" UUID NOT NULL,
    "coverPhotoId" UUID,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coupleNames" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    "edition" INTEGER NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "allowViewerDownload" BOOLEAN NOT NULL DEFAULT false,
    "perGuestUploadLimit" INTEGER NOT NULL,
    "eventUploadLimit" INTEGER,
    "usedBytes" BIGINT NOT NULL DEFAULT 0,
    "photoCount" INTEGER NOT NULL DEFAULT 0,
    "themeOverrides" JSONB,
    "publishedAt" TIMESTAMPTZ(3),
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_links" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "opensAt" TIMESTAMPTZ(3) NOT NULL,
    "closesAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "cookieTokenHash" TEXT NOT NULL,
    "displayName" TEXT,
    "uploadedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_versions" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "edition" INTEGER NOT NULL,
    "layoutDefinition" JSONB NOT NULL,
    "themeDefaults" JSONB NOT NULL,

    CONSTRAINT "template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minPhotos" INTEGER NOT NULL,
    "maxPhotos" INTEGER NOT NULL,
    "responsiveConfig" JSONB NOT NULL,

    CONSTRAINT "block_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_sections" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "gallery_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_blocks" (
    "id" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "blockTypeId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "settings" JSONB NOT NULL,

    CONSTRAINT "gallery_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_placements" (
    "id" UUID NOT NULL,
    "blockId" UUID NOT NULL,
    "photoId" UUID NOT NULL,
    "slot" INTEGER NOT NULL,
    "captionOverride" TEXT,
    "crop" JSONB,

    CONSTRAINT "photo_placements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_batches" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "guestId" UUID NOT NULL,
    "uploadLinkId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "message" TEXT,
    "status" "UploadBatchStatus" NOT NULL DEFAULT 'RESERVED',
    "reservedPhotoCount" INTEGER NOT NULL,
    "reservedBytes" BIGINT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "upload_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "uploadBatchId" UUID,
    "uploadedByHostId" UUID,
    "originalObjectKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "caption" TEXT,
    "capturedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_variants" (
    "id" UUID NOT NULL,
    "photoId" UUID NOT NULL,
    "kind" "PhotoVariantKind" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "byteSize" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,

    CONSTRAINT "photo_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderation_logs_photoId_idx" ON "moderation_logs"("photoId");

-- CreateIndex
CREATE INDEX "moderation_logs_eventId_idx" ON "moderation_logs"("eventId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE INDEX "subscriptions_hostId_idx" ON "subscriptions"("hostId");

-- CreateIndex
CREATE INDEX "subscriptions_status_endsAt_idx" ON "subscriptions"("status", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_invoiceNumber_key" ON "payments"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_trxId_key" ON "payments"("trxId");

-- CreateIndex
CREATE INDEX "payments_subscriptionId_idx" ON "payments"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_providerPaymentId_key" ON "payments"("provider", "providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_hostId_idx" ON "events"("hostId");

-- CreateIndex
CREATE INDEX "events_subscriptionId_idx" ON "events"("subscriptionId");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE UNIQUE INDEX "upload_links_tokenHash_key" ON "upload_links"("tokenHash");

-- CreateIndex
CREATE INDEX "upload_links_eventId_idx" ON "upload_links"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "guests_cookieTokenHash_key" ON "guests"("cookieTokenHash");

-- CreateIndex
CREATE INDEX "guests_eventId_idx" ON "guests"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "templates_code_key" ON "templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "template_versions_templateId_version_edition_key" ON "template_versions"("templateId", "version", "edition");

-- CreateIndex
CREATE UNIQUE INDEX "block_types_code_key" ON "block_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_sections_eventId_position_key" ON "gallery_sections"("eventId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_blocks_sectionId_position_key" ON "gallery_blocks"("sectionId", "position");

-- CreateIndex
CREATE INDEX "photo_placements_photoId_idx" ON "photo_placements"("photoId");

-- CreateIndex
CREATE UNIQUE INDEX "photo_placements_blockId_slot_key" ON "photo_placements"("blockId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "photo_placements_blockId_photoId_key" ON "photo_placements"("blockId", "photoId");

-- CreateIndex
CREATE INDEX "upload_batches_eventId_idx" ON "upload_batches"("eventId");

-- CreateIndex
CREATE INDEX "upload_batches_status_expiresAt_idx" ON "upload_batches"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "upload_batches_guestId_idempotencyKey_key" ON "upload_batches"("guestId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "photos_originalObjectKey_key" ON "photos"("originalObjectKey");

-- CreateIndex
CREATE INDEX "photos_eventId_approvalStatus_deletedAt_idx" ON "photos"("eventId", "approvalStatus", "deletedAt");

-- CreateIndex
CREATE INDEX "photos_uploadBatchId_idx" ON "photos"("uploadBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "photo_variants_objectKey_key" ON "photo_variants"("objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "photo_variants_photoId_kind_key" ON "photo_variants"("photoId", "kind");

-- AddForeignKey
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_coverPhotoId_fkey" FOREIGN KEY ("coverPhotoId") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_links" ADD CONSTRAINT "upload_links_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_sections" ADD CONSTRAINT "gallery_sections_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_blocks" ADD CONSTRAINT "gallery_blocks_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "gallery_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_blocks" ADD CONSTRAINT "gallery_blocks_blockTypeId_fkey" FOREIGN KEY ("blockTypeId") REFERENCES "block_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_placements" ADD CONSTRAINT "photo_placements_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "gallery_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_placements" ADD CONSTRAINT "photo_placements_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_batches" ADD CONSTRAINT "upload_batches_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_batches" ADD CONSTRAINT "upload_batches_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_batches" ADD CONSTRAINT "upload_batches_uploadLinkId_fkey" FOREIGN KEY ("uploadLinkId") REFERENCES "upload_links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_uploadBatchId_fkey" FOREIGN KEY ("uploadBatchId") REFERENCES "upload_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_uploadedByHostId_fkey" FOREIGN KEY ("uploadedByHostId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_variants" ADD CONSTRAINT "photo_variants_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Constraints Prisma cannot express in schema.prisma

-- A photo is uploaded either by a guest (via a batch) or by a host, never both or neither.
ALTER TABLE "photos" ADD CONSTRAINT "photos_exactly_one_uploader_chk"
  CHECK (("uploadBatchId" IS NOT NULL) <> ("uploadedByHostId" IS NOT NULL));

ALTER TABLE "block_types" ADD CONSTRAINT "block_types_photo_range_chk"
  CHECK ("minPhotos" >= 1 AND "maxPhotos" >= "minPhotos");

ALTER TABLE "photo_placements" ADD CONSTRAINT "photo_placements_slot_chk"
  CHECK ("slot" >= 0);

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_usage_chk"
  CHECK ("usedBytes" >= 0);

ALTER TABLE "events" ADD CONSTRAINT "events_usage_chk"
  CHECK ("usedBytes" >= 0 AND "photoCount" >= 0);
