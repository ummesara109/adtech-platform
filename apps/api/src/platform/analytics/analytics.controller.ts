import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdvertiserAuthGuard } from '../../auth/advertiser-auth.guard'
import { JwtAuthGuard } from '../../auth/jwt-auth.guard'
import { CurrentUser } from '../../auth/current-user.decorator'
import type { AuthUserContext } from '../../auth/auth.types'
import { AnalyticsService } from './analytics.service'

@Controller('advertiser/analytics')
@UseGuards(JwtAuthGuard, AdvertiserAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('playback')
  playback(@CurrentUser() user: AuthUserContext, @Query('days') days?: string) {
    return this.analytics.companyPlaybackSummary(user.companyId, days ? Number(days) : 14)
  }
}
