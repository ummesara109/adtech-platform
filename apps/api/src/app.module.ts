import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { AdvertiserModule } from './advertiser/advertiser.module'
import { CampaignsModule } from './campaigns/campaigns.module'
import { CreativesModule } from './creatives/creatives.module'
import { HealthController } from './health.controller'
import { InventoryModule } from './inventory/inventory.module'
import { DriversModule } from './drivers/drivers.module'
import { AdminModule } from './admin/admin.module'
import { PlatformModule } from './platform/platform.module'
import { PrismaModule } from './prisma/prisma.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PlatformModule,
    AuthModule,
    AdvertiserModule,
    CampaignsModule,
    CreativesModule,
    InventoryModule,
    DriversModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
