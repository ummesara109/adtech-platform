import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  DevicePairingStatus,
  DriverAccountStatus,
  PayoutStatus,
  PlaybackEventType,
  VerificationStatus,
} from '@prisma/client'
import type { AuthUserContext } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'
import { assertDriverScope } from './driver-scope.util'
import type { PairDeviceDto } from './dto/pair-device.dto'
import type { RegisterVehicleDto } from './dto/register-vehicle.dto'
import type { UpdateDriverProfileDto } from './dto/update-driver-profile.dto'

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(user: AuthUserContext) {
    const driverId = assertDriverScope(user)
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: { select: { email: true, fullName: true, phone: true } },
        kycDocuments: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!driver) throw new NotFoundException('Driver not found')
    return this.mapProfile(driver)
  }

  async updateProfile(user: AuthUserContext, dto: UpdateDriverProfileDto) {
    const driverId = assertDriverScope(user)
    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        address: dto.address ?? undefined,
        city: dto.city ?? undefined,
        licenseNumber: dto.licenseNumber ?? undefined,
        emergencyContact: dto.emergencyContact ?? undefined,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : undefined,
        user: dto.fullName || dto.phone
          ? {
              update: {
                fullName: dto.fullName ?? undefined,
                phone: dto.phone ?? undefined,
              },
            }
          : undefined,
      },
      include: {
        user: { select: { email: true, fullName: true, phone: true } },
        kycDocuments: { orderBy: { createdAt: 'asc' } },
      },
    })
    return this.mapProfile(driver)
  }

  async getKyc(user: AuthUserContext) {
    const driverId = assertDriverScope(user)
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { kycDocuments: { orderBy: { createdAt: 'asc' } } },
    })
    if (!driver) throw new NotFoundException('Driver not found')
    return {
      kycStatus: driver.kycStatus,
      kycSubmittedOn: driver.kycSubmittedOn,
      kycReviewedOn: driver.kycReviewedOn,
      documents: driver.kycDocuments.map((doc) => ({
        id: doc.id,
        label: doc.label,
        status: doc.status,
        uploaded: Boolean(doc.storageKey),
      })),
    }
  }

  async submitKyc(user: AuthUserContext) {
    const driverId = assertDriverScope(user)
    const docs = await this.prisma.driverKycDocument.findMany({ where: { driverId } })
    if (!docs.length) throw new BadRequestException('No KYC checklist configured')

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        kycStatus: VerificationStatus.UnderReview,
        kycSubmittedOn: new Date(),
      },
    })
    return { kycStatus: driver.kycStatus, kycSubmittedOn: driver.kycSubmittedOn }
  }

  async getDashboard(user: AuthUserContext) {
    const driverId = assertDriverScope(user)
    const timeZone = 'Asia/Kolkata'
    const now = new Date()
    const { year: periodYear, month: periodMonth, reportingDate, startOfDay, endOfDay } =
      calendarDayInTimeZone(now, timeZone)

    const STALE_SYNC_MS = 15 * 60 * 1000

    const [driver, vehicle, assignment, todayLogs, monthEarning, incentives, recentPaidPayout] =
      await Promise.all([
        this.prisma.driver.findUnique({
          where: { id: driverId },
          include: { user: { select: { fullName: true } } },
        }),
        this.prisma.vehicle.findFirst({
          where: { driverId },
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.deviceAssignment.findFirst({
          where: { driverId, unassignedAt: null },
          include: {
            device: {
              include: { telemetry: { orderBy: { recordedAt: 'desc' }, take: 1 } },
            },
            vehicle: true,
          },
          orderBy: { assignedAt: 'desc' },
        }),
        this.prisma.adPlaybackLog.findMany({
          where: {
            driverId,
            createdAt: { gte: startOfDay, lt: endOfDay },
          },
        }),
        this.prisma.partnerEarning.findUnique({
          where: {
            driverId_periodYear_periodMonth: {
              driverId,
              periodYear,
              periodMonth,
            },
          },
        }),
        this.prisma.partnerIncentive.findMany({
          where: { driverId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        this.prisma.payout.findFirst({
          where: { driverId, status: PayoutStatus.Paid, paidOn: { not: null } },
          orderBy: { paidOn: 'desc' },
        }),
      ])

    if (!driver) throw new NotFoundException('Driver not found')

    const hasPlaybackRecords = todayLogs.length > 0

    // Completed ≠ validated. Validated = Completed with positive valid duration.
    // Idempotency is enforced at insert (unique idempotencyKey); Started events are never validated.
    const completedLogs = todayLogs.filter((l) => l.eventType === PlaybackEventType.Completed)
    const interruptedLogs = todayLogs.filter((l) => l.eventType === PlaybackEventType.Interrupted)
    const validatedLogs = completedLogs.filter((l) => l.validDurationSec > 0)
    const validDurationSec = validatedLogs.reduce((sum, row) => sum + row.validDurationSec, 0)

    const device = assignment?.device
    const latestTelemetry = device?.telemetry[0]
    const lastSuccessfulSyncAt = latestTimestamp(device?.lastSeenAt, latestTelemetry?.recordedAt)
    const syncAgeMs = lastSuccessfulSyncAt ? now.getTime() - lastSuccessfulSyncAt.getTime() : null
    const syncDelayed = syncAgeMs != null ? syncAgeMs > STALE_SYNC_MS : Boolean(assignment && device)

    // Never treat "device row exists" as online. Online only when status says Online AND sync is fresh.
    let deviceConnectivityStatus: 'Unassigned' | 'Online' | 'Offline' = 'Unassigned'
    let deviceSyncHealthy = false
    let claimedOnline = false
    if (assignment && device) {
      claimedOnline = device.onlineStatus === 'Online'
      deviceSyncHealthy = claimedOnline && !syncDelayed && lastSuccessfulSyncAt != null
      deviceConnectivityStatus = deviceSyncHealthy ? 'Online' : 'Offline'
    }

    const monthIncentives = incentives.filter((i) => {
      if (!i.earnedAt) return false
      return i.earnedAt >= startOfMonthInTimeZone(periodYear, periodMonth, timeZone)
    })
    const incentiveTotalInr = monthIncentives.reduce((sum, row) => sum + row.amountInr, 0)

    const vehicleVerificationStatus = vehicle
      ? vehicle.status === 'Active'
        ? 'Verified'
        : vehicle.status === 'Pending'
          ? 'Pending verification'
          : 'Inactive'
      : null

    const alerts = buildDriverAlerts({
      hasVehicle: Boolean(vehicle),
      vehicleStatus: vehicle?.status ?? null,
      vehicleUpdatedAt: vehicle?.updatedAt ?? null,
      hasDeviceAssignment: Boolean(assignment),
      claimedOnline,
      deviceSyncHealthy,
      syncDelayed: Boolean(assignment && device && syncDelayed),
      lastSuccessfulSyncAt,
      recentPaidPayout,
    })

    return {
      driverName: driver.user.fullName?.trim() || null,
      serverDate: now.toISOString(),
      timeZone,
      reportingDate,
      reportingMonthLabel: `${periodYear}-${String(periodMonth).padStart(2, '0')}`,
      currency: 'INR',

      hasVehicle: Boolean(vehicle),
      vehicleRegistration: vehicle?.registrationNumber ?? null,
      vehicleStatus: vehicle?.status ?? null,
      vehicleVerificationStatus,

      hasDeviceAssignment: Boolean(assignment),
      deviceId: device?.id ?? null,
      deviceSerialNumber: device?.serialNumber ?? null,
      deviceOnline: device?.onlineStatus ?? null,
      deviceConnectivityStatus,
      deviceSyncHealthy,
      deviceSyncDelayed: Boolean(assignment && device && syncDelayed),
      devicePairingStatus: assignment?.pairingStatus ?? DevicePairingStatus.Unpaired,
      deviceConnectivityLabel: latestTelemetry?.connectivity ?? null,
      deviceLastSeenAt: device?.lastSeenAt?.toISOString() ?? null,
      deviceLastSuccessfulSyncAt: lastSuccessfulSyncAt?.toISOString() ?? null,
      deviceSignalStrength: latestTelemetry?.signalStrength ?? null,

      hasPlaybackRecords,
      todayCompletedCount: hasPlaybackRecords ? completedLogs.length : null,
      todayInterruptedCount: hasPlaybackRecords ? interruptedLogs.length : null,
      /** Validated playback only — Completed with validDurationSec > 0 */
      todayValidatedCount: hasPlaybackRecords ? validatedLogs.length : null,
      todayValidDurationSec: hasPlaybackRecords ? validDurationSec : null,
      todayRunningHours: hasPlaybackRecords
        ? Math.round((validDurationSec / 3600) * 10) / 10
        : null,
      /** Back-compat: validated count (not completed) */
      todayValidPlaybackCount: hasPlaybackRecords ? validatedLogs.length : null,

      hasEarningsRecord: Boolean(monthEarning),
      monthlyGrossInr: monthEarning?.grossAmountInr ?? null,
      monthlyCommissionInr: monthEarning?.commissionInr ?? null,
      /** No deductions column in PartnerEarning yet — never invent amounts */
      monthlyDeductionsInr: null,
      deductionsAvailable: false,
      monthlyIncentiveTotalInr: monthIncentives.length ? incentiveTotalInr : null,
      monthlyEarningsInr: monthEarning?.netAmountInr ?? null,
      incentives: monthIncentives.map((i) => ({
        id: i.id,
        title: i.title,
        amountInr: i.amountInr,
        status: i.status,
      })),

      /** Status-derived alerts from this driver's own records (not a notifications product table). */
      alerts,
      notificationCount: alerts.length,
    }
  }

  async getVehicle(user: AuthUserContext) {
    const driverId = assertDriverScope(user)
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { driverId },
      orderBy: { updatedAt: 'desc' },
    })
    if (!vehicle) {
      return { vehicle: null }
    }
    return {
      vehicle: {
        id: vehicle.id,
        registrationNumber: vehicle.registrationNumber,
        makeModel: vehicle.makeModel,
        vehicleType: vehicle.vehicleType,
        rcStorageKey: vehicle.rcStorageKey,
        year: vehicle.year,
        color: vehicle.color,
        status: vehicle.status,
        adScreenId: vehicle.adScreenId,
      },
    }
  }

  async registerVehicle(user: AuthUserContext, dto: RegisterVehicleDto) {
    const driverId = assertDriverScope(user)
    const reg = dto.registrationNumber.trim().toUpperCase()
    const existingForDriver = await this.prisma.vehicle.findFirst({ where: { driverId } })
    if (existingForDriver) {
      throw new BadRequestException('Vehicle already registered. Contact support to update.')
    }
    const vehicle = await this.prisma.vehicle.create({
      data: {
        driverId,
        registrationNumber: reg,
        makeModel: dto.makeModel?.trim() || '',
        vehicleType: dto.vehicleType?.trim() || 'Auto Rickshaw',
        rcStorageKey: dto.rcStorageKey?.trim() || '',
        year: dto.year,
        color: dto.color?.trim() || '',
      },
    })
    await this.prisma.driver.update({
      where: { id: driverId },
      data: { accountStatus: DriverAccountStatus.Active },
    })
    return { vehicle }
  }

  async uploadKycDocument(
    user: AuthUserContext,
    input: { documentId: string; storageKey: string },
  ) {
    const driverId = assertDriverScope(user)
    const doc = await this.prisma.driverKycDocument.findFirst({
      where: { id: input.documentId, driverId },
    })
    if (!doc) throw new NotFoundException('KYC document not found for this driver')
    const updated = await this.prisma.driverKycDocument.update({
      where: { id: doc.id },
      data: {
        storageKey: input.storageKey.trim(),
        status: 'Uploaded',
      },
    })
    return {
      document: {
        id: updated.id,
        label: updated.label,
        status: updated.status,
        uploaded: Boolean(updated.storageKey),
      },
    }
  }

  async attachRcDocument(user: AuthUserContext, storageKey: string) {
    const driverId = assertDriverScope(user)
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    })
    if (!vehicle) throw new NotFoundException('Register a vehicle before uploading RC')
    const updated = await this.prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { rcStorageKey: storageKey.trim() },
    })
    return {
      vehicle: {
        id: updated.id,
        registrationNumber: updated.registrationNumber,
        rcStorageKey: updated.rcStorageKey,
        status: updated.status,
      },
    }
  }

  async disconnectDevice(user: AuthUserContext) {
    const driverId = assertDriverScope(user)
    const assignment = await this.prisma.deviceAssignment.findFirst({
      where: { driverId, unassignedAt: null },
      orderBy: { assignedAt: 'desc' },
    })
    if (!assignment) throw new NotFoundException('No active device assignment')
    const updated = await this.prisma.deviceAssignment.update({
      where: { id: assignment.id },
      data: {
        pairingStatus: DevicePairingStatus.Unpaired,
        unassignedAt: new Date(),
      },
    })
    return { disconnected: true, assignmentId: updated.id }
  }

  /**
   * Activity stats for partner UI — derived only from this driver's AdPlaybackLog rows.
   * Time-of-day buckets use Asia/Kolkata hours of startedAt/createdAt.
   */
  async getActivitySummary(user: AuthUserContext) {
    const driverId = assertDriverScope(user)
    const timeZone = 'Asia/Kolkata'
    const now = new Date()
    const { reportingDate, startOfDay, endOfDay } = calendarDayInTimeZone(now, timeZone)

    const yesterdayDate = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000)
    const { startOfDay: yStart, endOfDay: yEnd } = calendarDayInTimeZone(yesterdayDate, timeZone)

    const weekStart = new Date(startOfDay.getTime() - 6 * 24 * 60 * 60 * 1000)

    const [todayLogs, yesterdayLogs, weekLogs, monthEarning, incentives, payouts] =
      await Promise.all([
        this.prisma.adPlaybackLog.findMany({
          where: { driverId, createdAt: { gte: startOfDay, lt: endOfDay } },
        }),
        this.prisma.adPlaybackLog.findMany({
          where: { driverId, createdAt: { gte: yStart, lt: yEnd } },
        }),
        this.prisma.adPlaybackLog.findMany({
          where: { driverId, createdAt: { gte: weekStart, lt: endOfDay } },
        }),
        this.prisma.partnerEarning.findMany({
          where: { driverId },
          orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
          take: 6,
        }),
        this.prisma.partnerIncentive.findMany({
          where: { driverId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        this.prisma.payout.findMany({
          where: { driverId },
          orderBy: { createdAt: 'desc' },
          take: 12,
        }),
      ])

    const validatedToday = todayLogs.filter(
      (l) => l.eventType === PlaybackEventType.Completed && l.validDurationSec > 0,
    )
    const validSec = validatedToday.reduce((s, r) => s + r.validDurationSec, 0)
    const buckets = { morning: 0, afternoon: 0, evening: 0 }
    for (const log of validatedToday) {
      const hour = Number(
        new Intl.DateTimeFormat('en-GB', {
          timeZone,
          hour: 'numeric',
          hour12: false,
        }).format(log.startedAt ?? log.createdAt),
      )
      if (hour < 12) buckets.morning += log.validDurationSec
      else if (hour < 17) buckets.afternoon += log.validDurationSec
      else buckets.evening += log.validDurationSec
    }

    const todayCompleted = todayLogs.filter((l) => l.eventType === PlaybackEventType.Completed).length
    const yesterdayCompleted = yesterdayLogs.filter(
      (l) => l.eventType === PlaybackEventType.Completed,
    ).length
    const vsYesterdayPct =
      yesterdayCompleted > 0
        ? Math.round(((todayCompleted - yesterdayCompleted) / yesterdayCompleted) * 100)
        : null

    const weekly: { day: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(startOfDay.getTime() - i * 24 * 60 * 60 * 1000)
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      const label = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(dayStart)
      const count = weekLogs.filter(
        (l) =>
          l.createdAt >= dayStart &&
          l.createdAt < dayEnd &&
          l.eventType === PlaybackEventType.Completed,
      ).length
      weekly.push({ day: label, count })
    }

    // Use validated hours from calendar month for incentive progress
    const { year, month } = calendarDayInTimeZone(now, timeZone)
    const monthStart = startOfMonthInTimeZone(year, month, timeZone)
    const monthLogs = await this.prisma.adPlaybackLog.findMany({
      where: {
        driverId,
        createdAt: { gte: monthStart, lt: endOfDay },
        eventType: PlaybackEventType.Completed,
        validDurationSec: { gt: 0 },
      },
    })
    const monthHours = Math.round((monthLogs.reduce((s, r) => s + r.validDurationSec, 0) / 3600) * 10) / 10
    const targetHours = 20

    return {
      reportingDate,
      timeZone,
      currency: 'INR',
      runningHours: {
        hasRecords: validatedToday.length > 0,
        totalValidSec: validatedToday.length ? validSec : null,
        totalLabel: validatedToday.length ? formatDurationLabel(validSec) : null,
        targetHoursPerDay: 4,
        buckets: validatedToday.length
          ? {
              morning: formatDurationLabel(buckets.morning),
              afternoon: formatDurationLabel(buckets.afternoon),
              evening: formatDurationLabel(buckets.evening),
              morningSec: buckets.morning,
              afternoonSec: buckets.afternoon,
              eveningSec: buckets.evening,
            }
          : null,
      },
      playback: {
        hasRecords: todayLogs.length > 0 || weekLogs.length > 0,
        totalCompletedToday: todayLogs.length ? todayCompleted : null,
        vsYesterdayPct,
        weekly,
      },
      earningsTrend: monthEarning.map((e) => ({
        periodLabel: `${e.periodYear}-${String(e.periodMonth).padStart(2, '0')}`,
        netAmountInr: e.netAmountInr,
        grossAmountInr: e.grossAmountInr,
      })),
      incentives: incentives.map((i) => ({
        id: i.id,
        title: i.title,
        amountInr: i.amountInr,
        status: i.status,
        earnedAt: i.earnedAt,
      })),
      incentiveProgress: {
        currentHours: monthHours,
        targetHours,
        label: `${monthHours} / ${targetHours} hrs`,
      },
      payouts: payouts.map((p) => ({
        id: p.id,
        amountInr: p.amountInr,
        status: p.status,
        reference: p.reference,
        paidOn: p.paidOn,
        createdAt: p.createdAt,
      })),
    }
  }

  async getDevice(user: AuthUserContext) {
    const driverId = assertDriverScope(user)
    const assignment = await this.prisma.deviceAssignment.findFirst({
      where: { driverId, unassignedAt: null },
      include: {
        device: {
          include: {
            telemetry: { orderBy: { recordedAt: 'desc' }, take: 1 },
          },
        },
        vehicle: true,
      },
      orderBy: { assignedAt: 'desc' },
    })
    if (!assignment) {
      return { assignment: null }
    }
    const latestTelemetry = assignment.device.telemetry[0]
    return {
      assignment: {
        id: assignment.id,
        pairingStatus: assignment.pairingStatus,
        pairingCode: assignment.pairingCode,
        assignedAt: assignment.assignedAt,
        vehicleRegistration: assignment.vehicle.registrationNumber,
        device: {
          id: assignment.device.id,
          serialNumber: assignment.device.serialNumber,
          firmwareVersion: assignment.device.firmwareVersion,
          onlineStatus: assignment.device.onlineStatus,
          lastSeenAt: assignment.device.lastSeenAt,
          mqttClientId: assignment.device.mqttClientId,
          connectivity: latestTelemetry?.connectivity ?? 'unknown',
          signalStrength: latestTelemetry?.signalStrength ?? null,
        },
      },
    }
  }

  async pairDevice(user: AuthUserContext, dto: PairDeviceDto) {
    const driverId = assertDriverScope(user)
    const code = dto.pairingCode.trim()
    if (!code) throw new BadRequestException('Pairing code is required')

    const assignment = await this.prisma.deviceAssignment.findFirst({
      where: {
        driverId,
        unassignedAt: null,
        pairingCode: code,
      },
      include: { device: true },
    })
    if (!assignment) {
      throw new NotFoundException('No pending assignment matches this pairing code')
    }

    const updated = await this.prisma.deviceAssignment.update({
      where: { id: assignment.id },
      data: { pairingStatus: DevicePairingStatus.Paired },
      include: { device: true, vehicle: true },
    })

    return {
      pairingStatus: updated.pairingStatus,
      deviceSerial: updated.device.serialNumber,
      vehicleRegistration: updated.vehicle.registrationNumber,
    }
  }

  async listPlayback(user: AuthUserContext, limit = 50) {
    const driverId = assertDriverScope(user)
    const rows = await this.prisma.adPlaybackLog.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    })
    return {
      items: rows.map((row) => ({
        id: row.id,
        eventType: row.eventType,
        validDurationSec: row.validDurationSec,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        campaignId: row.campaignId,
        createdAt: row.createdAt,
      })),
    }
  }

  async listEarnings(user: AuthUserContext) {
    const driverId = assertDriverScope(user)
    const rows = await this.prisma.partnerEarning.findMany({
      where: { driverId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    })
    return { items: rows }
  }

  async listIncentives(user: AuthUserContext) {
    const driverId = assertDriverScope(user)
    const rows = await this.prisma.partnerIncentive.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    })
    return { items: rows }
  }

  async createSupportIssue(user: AuthUserContext, input: { subject: string; description: string }) {
    const driverId = assertDriverScope(user)
    const issue = await this.prisma.driverSupportIssue.create({
      data: {
        driverId,
        subject: input.subject.trim(),
        description: input.description.trim(),
      },
    })
    return { issue }
  }

  async listSupportIssues(user: AuthUserContext) {
    const driverId = assertDriverScope(user)
    const rows = await this.prisma.driverSupportIssue.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    })
    return {
      items: rows.map((r) => ({
        id: r.id,
        subject: r.subject,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    }
  }

  async listPayouts(user: AuthUserContext) {
    const driverId = assertDriverScope(user)
    const rows = await this.prisma.payout.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    })
    return { items: rows }
  }

  /** Idempotent playback ingestion (device / pipeline). Scoped to driver's assigned device. */
  async ingestPlaybackEvent(
    user: AuthUserContext,
    input: {
      idempotencyKey: string
      eventType: PlaybackEventType
      validDurationSec?: number
      startedAt?: string
      endedAt?: string
      campaignId?: string
    },
  ) {
    const driverId = assertDriverScope(user)
    const existing = await this.prisma.adPlaybackLog.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    })
    if (existing) {
      if (existing.driverId !== driverId) {
        throw new ForbiddenException('Idempotency key belongs to another driver')
      }
      return { duplicate: true, log: existing }
    }

    const assignment = await this.prisma.deviceAssignment.findFirst({
      where: { driverId, unassignedAt: null },
    })

    const log = await this.prisma.adPlaybackLog.create({
      data: {
        driverId,
        deviceId: assignment?.deviceId,
        vehicleId: assignment?.vehicleId,
        campaignId: input.campaignId,
        eventType: input.eventType,
        idempotencyKey: input.idempotencyKey,
        validDurationSec: input.validDurationSec ?? 0,
        startedAt: input.startedAt ? new Date(input.startedAt) : null,
        endedAt: input.endedAt ? new Date(input.endedAt) : null,
      },
    })
    return { duplicate: false, log }
  }

  private mapProfile(driver: {
    id: string
    accountStatus: DriverAccountStatus
    kycStatus: VerificationStatus
    address: string
    city: string
    licenseNumber: string
    licenseExpiry: Date | null
    dateOfBirth: Date | null
    emergencyContact: string
    user: { email: string; fullName: string; phone: string }
    kycDocuments: { id: string; label: string; status: string }[]
  }) {
    return {
      id: driver.id,
      accountStatus: driver.accountStatus,
      kycStatus: driver.kycStatus,
      address: driver.address,
      city: driver.city,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry,
      dateOfBirth: driver.dateOfBirth,
      emergencyContact: driver.emergencyContact,
      email: driver.user.email,
      fullName: driver.user.fullName,
      phone: driver.user.phone,
      kycDocuments: driver.kycDocuments,
    }
  }
}

const REPORTING_TZ = 'Asia/Kolkata'

function calendarDayInTimeZone(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value)
  const day = Number(parts.find((p) => p.type === 'day')?.value)
  const reportingDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  // IST is fixed UTC+05:30 — align day bounds to Asia/Kolkata reporting calendar.
  const offset = timeZone === REPORTING_TZ || timeZone === 'Asia/Kolkata' ? '+05:30' : '+05:30'
  const startOfDay = new Date(`${reportingDate}T00:00:00${offset}`)
  const endOfDay = new Date(`${reportingDate}T23:59:59.999${offset}`)
  // end exclusive for range queries
  const endExclusive = new Date(endOfDay.getTime() + 1)
  return { year, month, reportingDate, startOfDay, endOfDay: endExclusive }
}

function startOfMonthInTimeZone(year: number, month: number, _timeZone: string) {
  const mm = String(month).padStart(2, '0')
  return new Date(`${year}-${mm}-01T00:00:00+05:30`)
}

function formatDurationLabel(totalSec: number) {
  const hours = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  if (hours <= 0) return `${mins}m`
  return `${hours}h ${String(mins).padStart(2, '0')}m`
}

function latestTimestamp(...values: Array<Date | null | undefined>): Date | null {
  const dates = values.filter((v): v is Date => v instanceof Date && !Number.isNaN(v.getTime()))
  if (!dates.length) return null
  return new Date(Math.max(...dates.map((d) => d.getTime())))
}

type DriverAlert = {
  id: string
  type:
    | 'device_disconnected'
    | 'device_sync_delayed'
    | 'vehicle_verification'
    | 'payment_credited'
  title: string
  body: string
  createdAt: string
}

function buildDriverAlerts(input: {
  hasVehicle: boolean
  vehicleStatus: string | null
  vehicleUpdatedAt: Date | null
  hasDeviceAssignment: boolean
  claimedOnline: boolean
  deviceSyncHealthy: boolean
  syncDelayed: boolean
  lastSuccessfulSyncAt: Date | null
  recentPaidPayout: { id: string; amountInr: number; paidOn: Date | null; reference: string } | null
}): DriverAlert[] {
  const alerts: DriverAlert[] = []

  if (input.hasDeviceAssignment && !input.deviceSyncHealthy) {
    if (input.claimedOnline && input.syncDelayed) {
      alerts.push({
        id: 'device-sync-delayed',
        type: 'device_sync_delayed',
        title: 'Device synchronization delayed',
        body: input.lastSuccessfulSyncAt
          ? `Last successful sync ${input.lastSuccessfulSyncAt.toISOString()}. Status is not treated as online until a fresh heartbeat arrives.`
          : 'Device is marked online but has no successful sync timestamp.',
        createdAt: (input.lastSuccessfulSyncAt ?? new Date()).toISOString(),
      })
    } else {
      alerts.push({
        id: 'device-disconnected',
        type: 'device_disconnected',
        title: 'Device disconnected',
        body: 'Your assigned advertising device is offline or has not reported a recent heartbeat.',
        createdAt: (input.lastSuccessfulSyncAt ?? new Date()).toISOString(),
      })
    }
  }

  if (input.hasVehicle && input.vehicleStatus === 'Pending') {
    alerts.push({
      id: 'vehicle-verification',
      type: 'vehicle_verification',
      title: 'Vehicle verification pending',
      body: 'Your vehicle registration is awaiting verification by the platform team.',
      createdAt: (input.vehicleUpdatedAt ?? new Date()).toISOString(),
    })
  }

  if (input.recentPaidPayout?.paidOn) {
    const paidOn = input.recentPaidPayout.paidOn
    const ageMs = Date.now() - paidOn.getTime()
    // Surface only recent credits (last 14 days) so Home stays relevant.
    if (ageMs <= 14 * 24 * 60 * 60 * 1000) {
      alerts.push({
        id: `payout-${input.recentPaidPayout.id}`,
        type: 'payment_credited',
        title: 'Payment credited',
        body: `₹${input.recentPaidPayout.amountInr.toLocaleString('en-IN')} marked paid${
          input.recentPaidPayout.reference ? ` (${input.recentPaidPayout.reference})` : ''
        }.`,
        createdAt: paidOn.toISOString(),
      })
    }
  }

  return alerts
}
