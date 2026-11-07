-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('Advertiser', 'Driver', 'SuperAdmin');

-- CreateEnum
CREATE TYPE "DriverAccountStatus" AS ENUM ('PendingRegistration', 'Active', 'Suspended');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('Pending', 'Active', 'Inactive');

-- CreateEnum
CREATE TYPE "DeviceOnlineStatus" AS ENUM ('Offline', 'Online');

-- CreateEnum
CREATE TYPE "DevicePairingStatus" AS ENUM ('Unpaired', 'Pending', 'Paired');

-- CreateEnum
CREATE TYPE "PlaybackEventType" AS ENUM ('Started', 'Completed', 'Interrupted');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('Pending', 'Processing', 'Paid', 'Failed');

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountStatus" "DriverAccountStatus" NOT NULL DEFAULT 'PendingRegistration',
    "kycStatus" "VerificationStatus" NOT NULL DEFAULT 'Pending',
    "dateOfBirth" TIMESTAMP(3),
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT 'Bengaluru',
    "licenseNumber" TEXT NOT NULL DEFAULT '',
    "licenseExpiry" TIMESTAMP(3),
    "emergencyContact" TEXT NOT NULL DEFAULT '',
    "kycSubmittedOn" TIMESTAMP(3),
    "kycReviewedOn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverKycDocument" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Required',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverKycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "makeModel" TEXT NOT NULL DEFAULT '',
    "year" INTEGER,
    "color" TEXT NOT NULL DEFAULT '',
    "status" "VehicleStatus" NOT NULL DEFAULT 'Pending',
    "adScreenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "firmwareVersion" TEXT NOT NULL DEFAULT '',
    "mqttClientId" TEXT NOT NULL DEFAULT '',
    "onlineStatus" "DeviceOnlineStatus" NOT NULL DEFAULT 'Offline',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceAssignment" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "pairingCode" TEXT NOT NULL DEFAULT '',
    "pairingStatus" "DevicePairingStatus" NOT NULL DEFAULT 'Unpaired',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "DeviceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceTelemetry" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connectivity" TEXT NOT NULL DEFAULT 'unknown',
    "signalStrength" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "DeviceTelemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdPlaybackLog" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "deviceId" TEXT,
    "vehicleId" TEXT,
    "campaignId" TEXT,
    "eventType" "PlaybackEventType" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "validDurationSec" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdPlaybackLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerEarning" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "grossAmountInr" INTEGER NOT NULL DEFAULT 0,
    "commissionInr" INTEGER NOT NULL DEFAULT 0,
    "netAmountInr" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerIncentive" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amountInr" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "earnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerIncentive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "amountInr" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'Pending',
    "reference" TEXT NOT NULL DEFAULT '',
    "paidOn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

-- CreateIndex
CREATE INDEX "Driver_kycStatus_idx" ON "Driver"("kycStatus");

-- CreateIndex
CREATE INDEX "DriverKycDocument_driverId_idx" ON "DriverKycDocument"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_registrationNumber_key" ON "Vehicle"("registrationNumber");

-- CreateIndex
CREATE INDEX "Vehicle_driverId_idx" ON "Vehicle"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_serialNumber_key" ON "Device"("serialNumber");

-- CreateIndex
CREATE INDEX "Device_onlineStatus_idx" ON "Device"("onlineStatus");

-- CreateIndex
CREATE INDEX "DeviceAssignment_driverId_idx" ON "DeviceAssignment"("driverId");

-- CreateIndex
CREATE INDEX "DeviceAssignment_deviceId_idx" ON "DeviceAssignment"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceAssignment_vehicleId_idx" ON "DeviceAssignment"("vehicleId");

-- CreateIndex
CREATE INDEX "DeviceTelemetry_deviceId_recordedAt_idx" ON "DeviceTelemetry"("deviceId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdPlaybackLog_idempotencyKey_key" ON "AdPlaybackLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AdPlaybackLog_driverId_createdAt_idx" ON "AdPlaybackLog"("driverId", "createdAt");

-- CreateIndex
CREATE INDEX "AdPlaybackLog_deviceId_idx" ON "AdPlaybackLog"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerEarning_driverId_periodYear_periodMonth_key" ON "PartnerEarning"("driverId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "PartnerEarning_driverId_idx" ON "PartnerEarning"("driverId");

-- CreateIndex
CREATE INDEX "PartnerIncentive_driverId_idx" ON "PartnerIncentive"("driverId");

-- CreateIndex
CREATE INDEX "Payout_driverId_idx" ON "Payout"("driverId");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverKycDocument" ADD CONSTRAINT "DriverKycDocument_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceTelemetry" ADD CONSTRAINT "DeviceTelemetry_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPlaybackLog" ADD CONSTRAINT "AdPlaybackLog_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPlaybackLog" ADD CONSTRAINT "AdPlaybackLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPlaybackLog" ADD CONSTRAINT "AdPlaybackLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEarning" ADD CONSTRAINT "PartnerEarning_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerIncentive" ADD CONSTRAINT "PartnerIncentive_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "DriverSupportIssue" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverSupportIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriverSupportIssue_driverId_idx" ON "DriverSupportIssue"("driverId");

-- AddForeignKey
ALTER TABLE "DriverSupportIssue" ADD CONSTRAINT "DriverSupportIssue_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
