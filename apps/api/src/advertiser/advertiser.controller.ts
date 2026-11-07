import { Controller, Get, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { AdvertiserAuthGuard } from '../auth/advertiser-auth.guard'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { AuthUserContext } from '../auth/auth.types'
import { AdvertiserService } from './advertiser.service'

@Controller('advertiser')
@UseGuards(JwtAuthGuard, AdvertiserAuthGuard)
export class AdvertiserController {
  constructor(private readonly advertiser: AdvertiserService) {}

  @Get('workspace')
  workspace(@CurrentUser() user: AuthUserContext) {
    return this.advertiser.getWorkspace(user)
  }
}
