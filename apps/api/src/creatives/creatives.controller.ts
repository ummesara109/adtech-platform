import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { AdvertiserAuthGuard } from '../auth/advertiser-auth.guard'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { AuthUserContext } from '../auth/auth.types'
import { CreativesService } from './creatives.service'
import { CreateCreativeDto } from './dto/create-creative.dto'

@Controller('advertiser/creatives')
@UseGuards(JwtAuthGuard, AdvertiserAuthGuard)
export class CreativesController {
  constructor(private readonly creatives: CreativesService) {}

  @Get()
  list(@CurrentUser() user: AuthUserContext) {
    return this.creatives.list(user)
  }

  @Post()
  create(@CurrentUser() user: AuthUserContext, @Body() body: CreateCreativeDto) {
    return this.creatives.create(user, body)
  }

  @Post(':id/archive')
  archive(@CurrentUser() user: AuthUserContext, @Param('id') id: string) {
    return this.creatives.archive(user, id)
  }
}
