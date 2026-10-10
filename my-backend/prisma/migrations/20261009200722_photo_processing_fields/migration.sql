-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "processingAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "processingStartedAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "photos_processingStatus_createdAt_idx" ON "photos"("processingStatus", "createdAt");
