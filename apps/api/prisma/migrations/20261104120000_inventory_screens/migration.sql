-- AlterTable
ALTER TABLE "InventoryArea" ADD COLUMN IF NOT EXISTS "centerLat" DOUBLE PRECISION;
ALTER TABLE "InventoryArea" ADD COLUMN IF NOT EXISTS "centerLng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "selectedScreenIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "daysOfWeek" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ScreenStatus" AS ENUM ('Active', 'Inactive', 'Maintenance');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ScreenBookingStatus" AS ENUM ('Hold', 'Reserved', 'Confirmed', 'Cancelled', 'Expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdScreen" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "autoId" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Bengaluru',
    "locality" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "ScreenStatus" NOT NULL DEFAULT 'Active',
    "label" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdScreen_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ScreenBooking" (
    "id" TEXT NOT NULL,
    "screenId" TEXT NOT NULL,
    "companyId" TEXT,
    "campaignId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "ScreenBookingStatus" NOT NULL,
    "holdExpiresAt" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "daysOfWeek" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreenBooking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdScreen_publicId_key" ON "AdScreen"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "AdScreen_autoId_key" ON "AdScreen"("autoId");
CREATE INDEX IF NOT EXISTS "AdScreen_city_locality_idx" ON "AdScreen"("city", "locality");
CREATE INDEX IF NOT EXISTS "AdScreen_status_idx" ON "AdScreen"("status");
CREATE INDEX IF NOT EXISTS "ScreenBooking_screenId_startAt_endAt_idx" ON "ScreenBooking"("screenId", "startAt", "endAt");
CREATE INDEX IF NOT EXISTS "ScreenBooking_status_idx" ON "ScreenBooking"("status");
CREATE INDEX IF NOT EXISTS "ScreenBooking_companyId_idx" ON "ScreenBooking"("companyId");
CREATE INDEX IF NOT EXISTS "ScreenBooking_campaignId_idx" ON "ScreenBooking"("campaignId");

DO $$ BEGIN
  ALTER TABLE "ScreenBooking" ADD CONSTRAINT "ScreenBooking_screenId_fkey"
    FOREIGN KEY ("screenId") REFERENCES "AdScreen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
