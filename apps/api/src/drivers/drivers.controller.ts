import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { DriverAuthGuard } from '../auth/driver-auth.guard'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUserContext } from '../auth/auth.types'
import { LocalUploadService } from '../platform/local-upload.service'
import { DriversService } from './drivers.service'
import { PairDeviceDto } from './dto/pair-device.dto'
import { PlaybackEventDto } from './dto/playback-event.dto'
import { RegisterVehicleDto } from './dto/register-vehicle.dto'
import { SupportIssueDto } from './dto/support-issue.dto'
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto'
import { UploadKycDocumentDto } from './dto/upload-kyc-document.dto'

@Controller('driver')
@UseGuards(JwtAuthGuard, DriverAuthGuard)
export class DriversController {
  constructor(
    private readonly drivers: DriversService,
    private readonly uploads: LocalUploadService,
  ) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUserContext) {
    return this.drivers.getDashboard(user)
  }

  @Get('profile')
  profile(@CurrentUser() user: AuthUserContext) {
    return this.drivers.getProfile(user)
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthUserContext, @Body() body: UpdateDriverProfileDto) {
    return this.drivers.updateProfile(user, body)
  }

  @Get('kyc')
  kyc(@CurrentUser() user: AuthUserContext) {
    return this.drivers.getKyc(user)
  }

  @Post('kyc/submit')
  submitKyc(@CurrentUser() user: AuthUserContext) {
    return this.drivers.submitKyc(user)
  }

  @Post('kyc/documents')
  uploadKyc(@CurrentUser() user: AuthUserContext, @Body() body: UploadKycDocumentDto) {
    return this.drivers.uploadKycDocument(user, body)
  }

  @Post('kyc/documents/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async uploadKycFile(
    @CurrentUser() user: AuthUserContext,
    @UploadedFile() file: Express.Multer.File,
    @Body('documentId') documentId: string,
  ) {
    if (!file?.buffer) throw new BadRequestException('file is required')
    if (!documentId) throw new BadRequestException('documentId is required')
    if (!user.driverId) throw new BadRequestException('Driver scope required')
    const saved = await this.uploads.saveDriverDocument({
      driverId: user.driverId,
      kind: 'kyc',
      originalName: file.originalname || 'document.bin',
      buffer: file.buffer,
    })
    return this.drivers.uploadKycDocument(user, {
      documentId,
      storageKey: saved.storageKey,
    })
  }

  @Post('vehicle/rc/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async uploadRc(
    @CurrentUser() user: AuthUserContext,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file?.buffer) throw new BadRequestException('file is required')
    if (!user.driverId) throw new BadRequestException('Driver scope required')
    const saved = await this.uploads.saveDriverDocument({
      driverId: user.driverId,
      kind: 'rc',
      originalName: file.originalname || 'rc.bin',
      buffer: file.buffer,
    })
    return this.drivers.attachRcDocument(user, saved.storageKey)
  }

  @Get('activity/summary')
  activitySummary(@CurrentUser() user: AuthUserContext) {
    return this.drivers.getActivitySummary(user)
  }

  @Post('device/disconnect')
  disconnectDevice(@CurrentUser() user: AuthUserContext) {
    return this.drivers.disconnectDevice(user)
  }

  @Get('vehicle')
  vehicle(@CurrentUser() user: AuthUserContext) {
    return this.drivers.getVehicle(user)
  }

  @Post('vehicle')
  registerVehicle(@CurrentUser() user: AuthUserContext, @Body() body: RegisterVehicleDto) {
    return this.drivers.registerVehicle(user, body)
  }

  @Get('device')
  device(@CurrentUser() user: AuthUserContext) {
    return this.drivers.getDevice(user)
  }

  @Post('device/pair')
  pairDevice(@CurrentUser() user: AuthUserContext, @Body() body: PairDeviceDto) {
    return this.drivers.pairDevice(user, body)
  }

  @Get('playback')
  playback(@CurrentUser() user: AuthUserContext, @Query('limit') limit?: string) {
    return this.drivers.listPlayback(user, limit ? Number(limit) : 50)
  }

  @Post('playback/events')
  playbackEvent(@CurrentUser() user: AuthUserContext, @Body() body: PlaybackEventDto) {
    return this.drivers.ingestPlaybackEvent(user, body)
  }

  @Get('earnings')
  earnings(@CurrentUser() user: AuthUserContext) {
    return this.drivers.listEarnings(user)
  }

  @Get('incentives')
  incentives(@CurrentUser() user: AuthUserContext) {
    return this.drivers.listIncentives(user)
  }

  @Get('payouts')
  payouts(@CurrentUser() user: AuthUserContext) {
    return this.drivers.listPayouts(user)
  }

  @Get('support/issues')
  listSupportIssues(@CurrentUser() user: AuthUserContext) {
    return this.drivers.listSupportIssues(user)
  }

  @Post('support/issues')
  supportIssue(@CurrentUser() user: AuthUserContext, @Body() body: SupportIssueDto) {
    return this.drivers.createSupportIssue(user, body)
  }
}
