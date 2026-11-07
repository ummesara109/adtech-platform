import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { AdvertiserAuthGuard } from '../auth/advertiser-auth.guard'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { AuthUserContext } from '../auth/auth.types'
import { CampaignsService } from './campaigns.service'
import { CreateCampaignDto } from './dto/create-campaign.dto'
import { ListCampaignsDto } from './dto/list-campaigns.dto'
import { ListStatusEventsDto } from './dto/list-status-events.dto'

@Controller('advertiser/campaigns')
@UseGuards(JwtAuthGuard, AdvertiserAuthGuard)
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  list(@CurrentUser() user: AuthUserContext, @Query() query: ListCampaignsDto) {
    return this.campaigns.list(user, query)
  }

  /** Must be registered before :publicId to avoid route capture. */
  @Get('status-events')
  statusEvents(@CurrentUser() user: AuthUserContext, @Query() query: ListStatusEventsDto) {
    return this.campaigns.listStatusEvents(user, query)
  }

  @Get(':publicId')
  get(@CurrentUser() user: AuthUserContext, @Param('publicId') publicId: string) {
    return this.campaigns.getByPublicId(user, publicId)
  }

  @Post()
  create(@CurrentUser() user: AuthUserContext, @Body() body: CreateCampaignDto) {
    return this.campaigns.create(user, body)
  }

  @Post(':publicId/pause')
  pause(@CurrentUser() user: AuthUserContext, @Param('publicId') publicId: string) {
    return this.campaigns.updateStatus(user, publicId, 'pause')
  }

  @Post(':publicId/resume')
  resume(@CurrentUser() user: AuthUserContext, @Param('publicId') publicId: string) {
    return this.campaigns.updateStatus(user, publicId, 'resume')
  }

  @Post(':publicId/cancel')
  cancel(@CurrentUser() user: AuthUserContext, @Param('publicId') publicId: string) {
    return this.campaigns.updateStatus(user, publicId, 'cancel')
  }

  @Post(':publicId/duplicate')
  duplicate(@CurrentUser() user: AuthUserContext, @Param('publicId') publicId: string) {
    return this.campaigns.updateStatus(user, publicId, 'duplicate')
  }
}
