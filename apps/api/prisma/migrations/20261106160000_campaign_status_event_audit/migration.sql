-- AlterTable
ALTER TABLE "CampaignStatusEvent" ADD COLUMN IF NOT EXISTS "previousStatus" "CampaignStatus";
ALTER TABLE "CampaignStatusEvent" ADD COLUMN IF NOT EXISTS "actorLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CampaignStatusEvent" ADD COLUMN IF NOT EXISTS "actorUserId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CampaignStatusEvent_createdAt_idx" ON "CampaignStatusEvent"("createdAt");
