import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  DeviceOnlineStatus,
  DevicePairingStatus,
  DriverAccountStatus,
  PlaybackEventType,
  VehicleStatus,
  VerificationStatus,
} from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

/** Validated playback INR rate used when recalculating partner earnings. */
const INR_PER_VALIDATED_HOUR = 45
const COMMISSION_RATE = 0.1
const WEEKLY_UPTIME_TARGET_HOURS = 20
const WEEKLY_UPTIME_BONUS_INR = 300

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listDrivers() {
    const rows = await this.prisma.driver.findMany({
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true, createdAt: true } },
        vehicles: { orderBy: { createdAt: 'desc' }, take: 1 },
        deviceAssignments: {
          where: { unassignedAt: null },
          include: { device: true },
          take: 1,
        },
        kycDocuments: true,
        _count: { select: { supportIssues: true, playbackLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      items: rows.map((d) => ({
        id: d.id,
        email: d.user.email,
        fullName: d.user.fullName,
        phone: d.user.phone,
        accountStatus: d.accountStatus,
        kycStatus: d.kycStatus,
        kycSubmittedOn: d.kycSubmittedOn,
        kycReviewedOn: d.kycReviewedOn,
        vehicle: d.vehicles[0]
          ? {
              id: d.vehicles[0].id,
              registrationNumber: d.vehicles[0].registrationNumber,
              status: d.vehicles[0].status,
              vehicleType: d.vehicles[0].vehicleType,
            }
          : null,
        device: d.deviceAssignments[0]
          ? {
              serialNumber: d.deviceAssignments[0].device.serialNumber,
              onlineStatus: d.deviceAssignments[0].device.onlineStatus,
              pairingStatus: d.deviceAssignments[0].pairingStatus,
            }
          : null,
        documentsUploaded: d.kycDocuments.filter((x) => Boolean(x.storageKey)).length,
        documentsTotal: d.kycDocuments.length,
        supportOpen: d._count.supportIssues,
        playbackCount: d._count.playbackLogs,
        createdAt: d.createdAt,
      })),
    }
  }

  async getDriver(driverId: string) {
    const d = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: true,
        vehicles: true,
        kycDocuments: true,
        deviceAssignments: { include: { device: true }, orderBy: { assignedAt: 'desc' } },
        supportIssues: { orderBy: { createdAt: 'desc' }, take: 20 },
        earnings: { orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }], take: 12 },
        incentives: { orderBy: { createdAt: 'desc' }, take: 20 },
        payouts: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!d) throw new NotFoundException('Driver not found')
    return { driver: d }
  }

  async reviewKyc(driverId: string, decision: 'approve' | 'reject', note?: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } })
    if (!driver) throw new NotFoundException('Driver not found')
    if (driver.kycStatus !== VerificationStatus.UnderReview && driver.kycStatus !== VerificationStatus.Pending) {
      throw new BadRequestException(`Cannot review KYC in status ${driver.kycStatus}`)
    }

    const kycStatus =
      decision === 'approve' ? VerificationStatus.Verified : VerificationStatus.Rejected

    const updated = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        kycStatus,
        kycReviewedOn: new Date(),
        accountStatus:
          decision === 'approve' ? DriverAccountStatus.Active : driver.accountStatus,
      },
    })

    if (decision === 'approve') {
      await this.prisma.driverKycDocument.updateMany({
        where: { driverId, storageKey: { not: '' } },
        data: { status: 'Verified' },
      })
    } else {
      await this.prisma.driverKycDocument.updateMany({
        where: { driverId },
        data: { status: note?.trim() ? `Rejected: ${note.trim()}` : 'Rejected' },
      })
    }

    return { driver: updated }
  }

  async reviewVehicle(vehicleId: string, decision: 'approve' | 'reject') {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } })
    if (!vehicle) throw new NotFoundException('Vehicle not found')
    const status = decision === 'approve' ? VehicleStatus.Active : VehicleStatus.Inactive
    const updated = await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status },
    })
    return { vehicle: updated }
  }

  async listSupportIssues(status?: string) {
    const rows = await this.prisma.driverSupportIssue.findMany({
      where: status ? { status } : undefined,
      include: {
        driver: { include: { user: { select: { fullName: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return {
      items: rows.map((r) => ({
        id: r.id,
        subject: r.subject,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt,
        driverId: r.driverId,
        driverName: r.driver.user.fullName,
        driverEmail: r.driver.user.email,
      })),
    }
  }

  async updateSupportIssue(issueId: string, status: string) {
    const issue = await this.prisma.driverSupportIssue.findUnique({ where: { id: issueId } })
    if (!issue) throw new NotFoundException('Support issue not found')
    const updated = await this.prisma.driverSupportIssue.update({
      where: { id: issueId },
      data: { status },
    })
    return { issue: updated }
  }

  /**
   * Hardware integration layer (simulator): marks device online, writes telemetry,
   * and optionally ingests a Completed playback for the assigned driver.
   */
  async simulateDeviceActivity(input: {
    deviceSerial?: string
    driverId?: string
    playbackSeconds?: number
    signalStrength?: number
  }) {
    let assignment = null as Awaited<ReturnType<typeof this.findActiveAssignment>>

    if (input.driverId) {
      assignment = await this.findActiveAssignment({ driverId: input.driverId })
    } else if (input.deviceSerial) {
      const device = await this.prisma.device.findUnique({
        where: { serialNumber: input.deviceSerial },
      })
      if (!device) throw new NotFoundException('Device not found')
      assignment = await this.findActiveAssignment({ deviceId: device.id })
    } else {
      throw new BadRequestException('Provide deviceSerial or driverId')
    }

    if (!assignment) throw new NotFoundException('No active device assignment')

    const now = new Date()
    await this.prisma.device.update({
      where: { id: assignment.deviceId },
      data: {
        onlineStatus: DeviceOnlineStatus.Online,
        lastSeenAt: now,
      },
    })

    await this.prisma.deviceTelemetry.create({
      data: {
        deviceId: assignment.deviceId,
        recordedAt: now,
        connectivity: '4G',
        signalStrength: input.signalStrength ?? -65,
        metadata: { source: 'device-simulator' },
      },
    })

    let playback = null
    const seconds = Math.max(0, Number(input.playbackSeconds ?? 0))
    if (seconds > 0 && assignment.driverId) {
      const key = `sim-${assignment.deviceId}-${now.getTime()}`
      playback = await this.prisma.adPlaybackLog.create({
        data: {
          driverId: assignment.driverId,
          deviceId: assignment.deviceId,
          vehicleId: assignment.vehicleId,
          eventType: PlaybackEventType.Completed,
          idempotencyKey: key,
          startedAt: new Date(now.getTime() - seconds * 1000),
          endedAt: now,
          validDurationSec: seconds,
        },
      })
    }

    return {
      ok: true,
      deviceId: assignment.deviceId,
      driverId: assignment.driverId,
      onlineStatus: DeviceOnlineStatus.Online,
      playbackId: playback?.id ?? null,
      note: 'Simulator event written. Replace this endpoint with MQTT/hardware ingestion in production.',
    }
  }

  /** Issue a pairing code for a driver's vehicle + advertising device (ops / hardware desk). */
  async issuePairing(driverId: string, serialNumber: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } })
    if (!driver) throw new NotFoundException('Driver not found')
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    })
    if (!vehicle) {
      throw new BadRequestException('Driver must register a vehicle before a device can be issued')
    }

    const serial = serialNumber.trim().toUpperCase()
    const device = await this.prisma.device.upsert({
      where: { serialNumber: serial },
      create: {
        serialNumber: serial,
        firmwareVersion: 'sim-1.0.0',
        mqttClientId: `sim-${serial}`,
        onlineStatus: DeviceOnlineStatus.Offline,
      },
      update: {},
    })

    const activeOnDevice = await this.prisma.deviceAssignment.findFirst({
      where: { deviceId: device.id, unassignedAt: null },
    })
    if (activeOnDevice && activeOnDevice.driverId !== driverId) {
      throw new BadRequestException('Device is already assigned to another driver')
    }
    if (activeOnDevice) {
      return {
        device,
        pairingCode: activeOnDevice.pairingCode,
        pairingStatus: activeOnDevice.pairingStatus,
        alreadyAssigned: true,
      }
    }

    await this.prisma.deviceAssignment.updateMany({
      where: { driverId, unassignedAt: null },
      data: { unassignedAt: new Date(), pairingStatus: DevicePairingStatus.Unpaired },
    })

    const pairingCode = `PAIR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const assignment = await this.prisma.deviceAssignment.create({
      data: {
        deviceId: device.id,
        vehicleId: vehicle.id,
        driverId,
        pairingCode,
        pairingStatus: DevicePairingStatus.Pending,
      },
    })
    return {
      device,
      pairingCode: assignment.pairingCode,
      pairingStatus: assignment.pairingStatus,
      alreadyAssigned: false,
    }
  }

  /**
   * Recalculate monthly PartnerEarning from validated Completed playback seconds.
   */
  async recalculateEarnings(driverId: string, periodYear?: number, periodMonth?: number) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } })
    if (!driver) throw new NotFoundException('Driver not found')

    const now = new Date()
    const year = periodYear ?? now.getFullYear()
    const month = periodMonth ?? now.getMonth() + 1
    const start = new Date(Date.UTC(year, month - 1, 1))
    const end = new Date(Date.UTC(year, month, 1))

    const logs = await this.prisma.adPlaybackLog.findMany({
      where: {
        driverId,
        eventType: PlaybackEventType.Completed,
        createdAt: { gte: start, lt: end },
        validDurationSec: { gt: 0 },
      },
    })

    const totalSec = logs.reduce((s, l) => s + (l.validDurationSec || 0), 0)
    const grossAmountInr = Math.round((totalSec / 3600) * INR_PER_VALIDATED_HOUR)
    const commissionInr = Math.round(grossAmountInr * COMMISSION_RATE)
    const netAmountInr = Math.max(0, grossAmountInr - commissionInr)

    const earning = await this.prisma.partnerEarning.upsert({
      where: {
        driverId_periodYear_periodMonth: { driverId, periodYear: year, periodMonth: month },
      },
      create: {
        driverId,
        periodYear: year,
        periodMonth: month,
        grossAmountInr,
        commissionInr,
        netAmountInr,
      },
      update: { grossAmountInr, commissionInr, netAmountInr },
    })

    return {
      earning,
      validatedSeconds: totalSec,
      rateInrPerHour: INR_PER_VALIDATED_HOUR,
      playbackCount: logs.length,
    }
  }

  /**
   * Award weekly uptime incentive when validated hours in last 7 days meet target.
   */
  async evaluateIncentives(driverId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } })
    if (!driver) throw new NotFoundException('Driver not found')

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const logs = await this.prisma.adPlaybackLog.findMany({
      where: {
        driverId,
        eventType: PlaybackEventType.Completed,
        createdAt: { gte: since },
        validDurationSec: { gt: 0 },
      },
    })
    const hours = logs.reduce((s, l) => s + (l.validDurationSec || 0), 0) / 3600
    const eligible = hours >= WEEKLY_UPTIME_TARGET_HOURS

    const title = 'Weekly uptime target'
    let incentive = await this.prisma.partnerIncentive.findFirst({
      where: { driverId, title, status: { in: ['Pending', 'Earned'] } },
      orderBy: { createdAt: 'desc' },
    })

    if (!incentive) {
      incentive = await this.prisma.partnerIncentive.create({
        data: {
          driverId,
          title,
          amountInr: WEEKLY_UPTIME_BONUS_INR,
          status: eligible ? 'Earned' : 'Pending',
          earnedAt: eligible ? new Date() : null,
        },
      })
    } else if (eligible && incentive.status !== 'Earned') {
      incentive = await this.prisma.partnerIncentive.update({
        where: { id: incentive.id },
        data: { status: 'Earned', earnedAt: new Date(), amountInr: WEEKLY_UPTIME_BONUS_INR },
      })
    }

    return {
      hours: Math.round(hours * 100) / 100,
      targetHours: WEEKLY_UPTIME_TARGET_HOURS,
      eligible,
      incentive,
    }
  }

  private findActiveAssignment(where: { driverId?: string; deviceId?: string }) {
    return this.prisma.deviceAssignment.findFirst({
      where: {
        unassignedAt: null,
        pairingStatus: DevicePairingStatus.Paired,
        ...(where.driverId ? { driverId: where.driverId } : {}),
        ...(where.deviceId ? { deviceId: where.deviceId } : {}),
      },
      orderBy: { assignedAt: 'desc' },
    })
  }
}
