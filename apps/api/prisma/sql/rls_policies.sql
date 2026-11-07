-- PostgreSQL RLS helpers for Supabase / company-scoped advertiser data.
-- NestJS still enforces RBAC in application code; RLS is defense-in-depth when
-- clients or Edge Functions hit Postgres directly with a JWT that sets app.company_id.

DO $$
BEGIN
  -- Safe to re-run: enable RLS on tenant tables if they exist.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Campaign') THEN
    EXECUTE 'ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS campaign_company_isolation ON "Campaign"';
    EXECUTE 'CREATE POLICY campaign_company_isolation ON "Campaign"
      USING ("companyId" = current_setting(''app.company_id'', true))
      WITH CHECK ("companyId" = current_setting(''app.company_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Creative') THEN
    EXECUTE 'ALTER TABLE "Creative" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS creative_company_isolation ON "Creative"';
    EXECUTE 'CREATE POLICY creative_company_isolation ON "Creative"
      USING ("companyId" = current_setting(''app.company_id'', true))
      WITH CHECK ("companyId" = current_setting(''app.company_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Invoice') THEN
    EXECUTE 'ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS invoice_company_isolation ON "Invoice"';
    EXECUTE 'CREATE POLICY invoice_company_isolation ON "Invoice"
      USING ("companyId" = current_setting(''app.company_id'', true))
      WITH CHECK ("companyId" = current_setting(''app.company_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Driver') THEN
    EXECUTE 'ALTER TABLE "Driver" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS driver_self_isolation ON "Driver"';
    EXECUTE 'CREATE POLICY driver_self_isolation ON "Driver"
      USING ("id" = current_setting(''app.driver_id'', true))
      WITH CHECK ("id" = current_setting(''app.driver_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Vehicle') THEN
    EXECUTE 'ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS vehicle_driver_isolation ON "Vehicle"';
    EXECUTE 'CREATE POLICY vehicle_driver_isolation ON "Vehicle"
      USING ("driverId" = current_setting(''app.driver_id'', true))
      WITH CHECK ("driverId" = current_setting(''app.driver_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PartnerEarning') THEN
    EXECUTE 'ALTER TABLE "PartnerEarning" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS partner_earning_driver_isolation ON "PartnerEarning"';
    EXECUTE 'CREATE POLICY partner_earning_driver_isolation ON "PartnerEarning"
      USING ("driverId" = current_setting(''app.driver_id'', true))
      WITH CHECK ("driverId" = current_setting(''app.driver_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Payout') THEN
    EXECUTE 'ALTER TABLE "Payout" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS payout_driver_isolation ON "Payout"';
    EXECUTE 'CREATE POLICY payout_driver_isolation ON "Payout"
      USING ("driverId" = current_setting(''app.driver_id'', true))
      WITH CHECK ("driverId" = current_setting(''app.driver_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AdPlaybackLog') THEN
    EXECUTE 'ALTER TABLE "AdPlaybackLog" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS playback_driver_isolation ON "AdPlaybackLog"';
    EXECUTE 'CREATE POLICY playback_driver_isolation ON "AdPlaybackLog"
      USING ("driverId" = current_setting(''app.driver_id'', true))
      WITH CHECK ("driverId" = current_setting(''app.driver_id'', true))';
  END IF;
END $$;
