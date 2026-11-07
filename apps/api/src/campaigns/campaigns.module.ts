import { Module } from '@nestjs/common'
import { InventoryModule } from '../inventory/inventory.module'
import { CampaignsController } from './campaigns.controller'
import { CampaignsService } from './campaigns.service'

@Module({
  imports: [InventoryModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
})
export class CampaignsModule {}
