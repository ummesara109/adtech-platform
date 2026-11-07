import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { AdvertiserAuthGuard } from '../auth/advertiser-auth.guard'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { AuthUserContext } from '../auth/auth.types'
import {
  AvailabilityQueryDto,
  CreateHoldsDto,
  ValidateSelectionDto,
} from './dto/availability-query.dto'
import { InventoryService } from './inventory.service'

@Controller('advertiser/inventory')
@UseGuards(JwtAuthGuard, AdvertiserAuthGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  list(@CurrentUser() user: AuthUserContext) {
    return this.inventory.list(user)
  }

  @Get('localities')
  localities(@Query('city') city = 'Bengaluru') {
    return this.inventory.localities(city)
  }

  @Post('availability')
  availability(@CurrentUser() user: AuthUserContext, @Body() body: AvailabilityQueryDto) {
    return this.inventory.queryAvailability(user, body)
  }

  @Post('holds')
  holds(@CurrentUser() user: AuthUserContext, @Body() body: CreateHoldsDto) {
    return this.inventory.createHolds(user, body)
  }

  @Post('validate')
  validate(@CurrentUser() user: AuthUserContext, @Body() body: ValidateSelectionDto) {
    return this.inventory.validateSelection(user, body)
  }
}
