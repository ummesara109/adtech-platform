-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('Pending', 'UnderReview', 'Verified', 'Rejected');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('Admin', 'CampaignManager', 'BillingViewer', 'Analyst');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('Draft', 'Submitted', 'UnderReview', 'RevisionRequired', 'Approved', 'Scheduled', 'Live', 'Paused', 'Completed', 'Rejected', 'Cancelled');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('Draft', 'Submitted', 'UnderReview', 'Approved', 'Rejected', 'RevisionRequired');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('NotStarted', 'Scheduled', 'Live', 'Paused', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Pending', 'Authorized', 'Paid', 'Failed', 'Refunded', 'PartiallyRefunded');

-- CreateEnum
CREATE TYPE "CreativeType" AS ENUM ('Video', 'Image');

-- CreateEnum
CREATE TYPE "CreativeModerationStatus" AS ENUM ('Draft', 'PendingModeration', 'Approved', 'RevisionRequired', 'Archived');

-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('campaign', 'creative', 'approval', 'payment', 'account');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL DEFAULT '',
    "tradeName" TEXT NOT NULL DEFAULT '',
    "businessType" TEXT NOT NULL DEFAULT '',
    "gstin" TEXT NOT NULL DEFAULT '',
    "registeredAddress" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT 'Bengaluru',
    "industry" TEXT NOT NULL DEFAULT '',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'Pending',
    "verificationNotes" TEXT NOT NULL DEFAULT '',
    "verificationSubmittedOn" TIMESTAMP(3),
    "verificationReviewedOn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMember" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Required',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryArea" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Bengaluru',
    "area" TEXT NOT NULL,
    "availableDevices" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InventoryArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creative" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "type" "CreativeType" NOT NULL,
    "sizeLabel" TEXT NOT NULL DEFAULT '',
    "spec" TEXT NOT NULL DEFAULT '1920×1080 · 16:9',
    "version" TEXT NOT NULL DEFAULT 'v1',
    "moderationStatus" "CreativeModerationStatus" NOT NULL DEFAULT 'Draft',
    "previewNote" TEXT NOT NULL DEFAULT '',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "previewUrl" TEXT NOT NULL DEFAULT '',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "CampaignStatus" NOT NULL DEFAULT 'Draft',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'Draft',
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'NotStarted',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "locations" TEXT[],
    "requestedAutos" INTEGER NOT NULL DEFAULT 0,
    "allocatedAutos" INTEGER NOT NULL DEFAULT 0,
    "budgetInr" INTEGER NOT NULL DEFAULT 0,
    "estimatedReach" INTEGER NOT NULL DEFAULT 0,
    "scheduledPlays" INTEGER,
    "creativeId" TEXT,
    "operatingStart" TEXT NOT NULL DEFAULT '08:00',
    "operatingEnd" TEXT NOT NULL DEFAULT '20:00',
    "frequencyCap" INTEGER NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignStatusEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "campaignId" TEXT,
    "campaignName" TEXT NOT NULL,
    "amountInr" INTEGER NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "issuedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "campaignId" TEXT,
    "campaignName" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amountInr" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "paidOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Account',
    "campaignId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybackDaily" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "playbackStarts" INTEGER NOT NULL DEFAULT 0,
    "completedPlays" INTEGER NOT NULL DEFAULT 0,
    "failedPlays" INTEGER NOT NULL DEFAULT 0,
    "scheduledPlays" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlaybackDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybackReport" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "targetedDevices" INTEGER NOT NULL DEFAULT 0,
    "activeDevices" INTEGER NOT NULL DEFAULT 0,
    "playbackStarts" INTEGER NOT NULL DEFAULT 0,
    "completedPlays" INTEGER NOT NULL DEFAULT 0,
    "interruptedPlays" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runningHours" INTEGER NOT NULL DEFAULT 0,
    "expenditureInr" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlaybackReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationPlayback" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "completedPlays" INTEGER NOT NULL DEFAULT 0,
    "targetedDevices" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LocationPlayback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "CompanyMember_userId_idx" ON "CompanyMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMember_companyId_userId_key" ON "CompanyMember"("companyId", "userId");

-- CreateIndex
CREATE INDEX "KycDocument_companyId_idx" ON "KycDocument"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryArea_city_area_key" ON "InventoryArea"("city", "area");

-- CreateIndex
CREATE INDEX "Creative_companyId_idx" ON "Creative"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_publicId_key" ON "Campaign"("publicId");

-- CreateIndex
CREATE INDEX "Campaign_companyId_idx" ON "Campaign"("companyId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "CampaignStatusEvent_campaignId_idx" ON "CampaignStatusEvent"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_publicId_key" ON "Invoice"("publicId");

-- CreateIndex
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_publicId_key" ON "Payment"("publicId");

-- CreateIndex
CREATE INDEX "Payment_companyId_idx" ON "Payment"("companyId");

-- CreateIndex
CREATE INDEX "Notification_companyId_idx" ON "Notification"("companyId");

-- CreateIndex
CREATE INDEX "ActivityEvent_companyId_idx" ON "ActivityEvent"("companyId");

-- CreateIndex
CREATE INDEX "PlaybackDaily_companyId_idx" ON "PlaybackDaily"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaybackDaily_companyId_date_key" ON "PlaybackDaily"("companyId", "date");

-- CreateIndex
CREATE INDEX "PlaybackReport_companyId_idx" ON "PlaybackReport"("companyId");

-- CreateIndex
CREATE INDEX "PlaybackReport_campaignId_idx" ON "PlaybackReport"("campaignId");

-- CreateIndex
CREATE INDEX "LocationPlayback_companyId_idx" ON "LocationPlayback"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationPlayback_companyId_area_key" ON "LocationPlayback"("companyId", "area");

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creative" ADD CONSTRAINT "Creative_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "Creative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignStatusEvent" ADD CONSTRAINT "CampaignStatusEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackDaily" ADD CONSTRAINT "PlaybackDaily_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackReport" ADD CONSTRAINT "PlaybackReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackReport" ADD CONSTRAINT "PlaybackReport_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationPlayback" ADD CONSTRAINT "LocationPlayback_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
