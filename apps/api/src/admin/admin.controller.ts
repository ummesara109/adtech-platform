import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator'
import { Type } from 'class-transformer'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { SuperAdminGuard } from '../auth/super-admin.guard'
import { AdminService } from './admin.service'

class ReviewDto {
  @IsIn(['approve', 'reject'])
  decision!: 'approve' | 'reject'

  @IsOptional()
  @IsString()
  note?: string
}

class SupportStatusDto {
  @IsString()
  @MinLength(2)
  status!: string
}

class SimulateDto {
  @IsOptional()
  @IsString()
  deviceSerial?: string

  @IsOptional()
  @IsString()
  driverId?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  playbackSeconds?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  signalStrength?: number
}

class IssuePairingDto {
  @IsString()
  @MinLength(2)
  driverId!: string

  @IsString()
  @MinLength(3)
  serialNumber!: string
}

class RecalcDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodYear?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodMonth?: number
}

@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('drivers')
  listDrivers() {
    return this.admin.listDrivers()
  }

  @Get('drivers/:id')
  getDriver(@Param('id') id: string) {
    return this.admin.getDriver(id)
  }

  @Post('drivers/:id/kyc/review')
  reviewKyc(@Param('id') id: string, @Body() body: ReviewDto) {
    return this.admin.reviewKyc(id, body.decision, body.note)
  }

  @Post('vehicles/:id/review')
  reviewVehicle(@Param('id') id: string, @Body() body: ReviewDto) {
    return this.admin.reviewVehicle(id, body.decision)
  }

  @Get('support/issues')
  listSupport(@Query('status') status?: string) {
    return this.admin.listSupportIssues(status)
  }

  @Patch('support/issues/:id')
  updateSupport(@Param('id') id: string, @Body() body: SupportStatusDto) {
    return this.admin.updateSupportIssue(id, body.status)
  }

  @Post('devices/issue-pairing')
  issuePairing(@Body() body: IssuePairingDto) {
    return this.admin.issuePairing(body.driverId, body.serialNumber)
  }

  @Post('devices/simulate')
  simulate(@Body() body: SimulateDto) {
    return this.admin.simulateDeviceActivity(body)
  }

  @Post('drivers/:id/earnings/recalculate')
  recalc(@Param('id') id: string, @Body() body: RecalcDto) {
    return this.admin.recalculateEarnings(id, body.periodYear, body.periodMonth)
  }

  @Post('drivers/:id/incentives/evaluate')
  evaluate(@Param('id') id: string) {
    return this.admin.evaluateIncentives(id)
  }
}
