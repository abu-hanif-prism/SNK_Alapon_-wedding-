-- AlterTable
ALTER TABLE "events" ADD COLUMN     "accessPin" TEXT,
ADD COLUMN     "allowGuestNotes" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "brideName" TEXT,
ADD COLUMN     "content" JSONB,
ADD COLUMN     "groomName" TEXT,
ADD COLUMN     "requireGuestName" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "venue" TEXT,
ADD COLUMN     "welcomeMessage" TEXT;

-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "guestNote" TEXT;

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "durationMonths" INTEGER;

-- AlterTable
ALTER TABLE "upload_links" ADD COLUMN     "tokenEnc" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phoneVerifiedAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "phone_verifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "phone_verifications_userId_createdAt_idx" ON "phone_verifications"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "phone_verifications" ADD CONSTRAINT "phone_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
