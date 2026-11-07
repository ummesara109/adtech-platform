import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { Prisma, ScreenBookingStatus, ScreenStatus } from '@prisma/client'
import type { AuthUserContext } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'
import {
  bookingBlocksWindow,
  DEFAULT_TZ,
  expandScheduleWindows,
  parseHmToMinutes,
  type ScheduleWindow,
} from './availability.util'
import type { AvailabilityQueryDto, CreateHoldsDto, ValidateSelectionDto } from './dto/availability-query.dto'

const HOLD_TTL_MS = 15 * 60_000

export type ScreenAvailabilityStatus = 'available' | 'booked' | 'unavailable'

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUserContext) {
    const [areas, campaigns, screenCounts] = await Promise.all([
      this.prisma.inventoryArea.findMany({ orderBy: { area: 'asc' } }),
      this.prisma.campaign.findMany({
        where: { companyId: user.companyId },
        select: { locations: true, requestedAutos: true, allocatedAutos: true, status: true },
      }),
      this.prisma.adScreen.groupBy({
        by: ['city', 'locality', 'status'],
        _count: { _all: true },
      }),
    ])

    const activeByLocality = new Map<string, number>()
    for (const row of screenCounts) {
      if (row.status !== ScreenStatus.Active) continue
      const key = `${row.city}::${row.locality}`
      activeByLocality.set(key, (activeByLocality.get(key) || 0) + row._count._all)
    }

    const requestedByArea = new Map<string, number>()
    const allocatedByArea = new Map<string, number>()
    for (const campaign of campaigns) {
      for (const area of campaign.locations) {
        requestedByArea.set(area, (requestedByArea.get(area) || 0) + campaign.requestedAutos)
        allocatedByArea.set(area, (allocatedByArea.get(area) || 0) + campaign.allocatedAutos)
      }
    }

    const areasMapped = areas.map((area) => {
      const liveActive = activeByLocality.get(`${area.city}::${area.area}`)
      return {
        id: area.id,
        city: area.city,
        area: area.area,
        centerLat: area.centerLat,
        centerLng: area.centerLng,
        availableDevices: liveActive ?? area.availableDevices,
        requestedAutos: requestedByArea.get(area.area) || 0,
        allocatedAutos: allocatedByArea.get(area.area) || 0,
      }
    })

    const totalActive = [...activeByLocality.values()].reduce((a, b) => a + b, 0)

    return {
      areas: areasMapped,
      totals: {
        available: totalActive,
        requested: campaigns.reduce((sum, row) => sum + row.requestedAutos, 0),
        allocated: campaigns.reduce((sum, row) => sum + row.allocatedAutos, 0),
      },
      note:
        totalActive === 0
          ? 'No active screens are registered in the inventory database yet.'
          : null,
    }
  }

  async localities(city: string) {
    const areas = await this.prisma.inventoryArea.findMany({
      where: { city },
      orderBy: { area: 'asc' },
    })
    const counts = await this.prisma.adScreen.groupBy({
      by: ['locality'],
      where: { city },
      _count: { _all: true },
    })
    const countMap = new Map(counts.map((row) => [row.locality, row._count._all]))
    return areas.map((area) => ({
      id: area.id,
      city: area.city,
      name: area.area,
      centerLat: area.centerLat,
      centerLng: area.centerLng,
      registeredScreens: countMap.get(area.area) || 0,
    }))
  }

  async queryAvailability(user: AuthUserContext, dto: AvailabilityQueryDto) {
    const schedule = this.assertAndExpandSchedule(dto)
    const localities = dto.localities.filter(Boolean)
    const now = new Date()

    await this.expireStaleHolds()

    const screens = await this.prisma.adScreen.findMany({
      where: {
        city: dto.city,
        ...(localities.length ? { locality: { in: localities } } : {}),
      },
      include: {
        bookings: {
          where: {
            status: {
              in: [ScreenBookingStatus.Hold, ScreenBookingStatus.Reserved, ScreenBookingStatus.Confirmed],
            },
            OR: schedule.map((window) => ({
              startAt: { lt: window.endAt },
              endAt: { gt: window.startAt },
            })),
          },
        },
      },
      orderBy: [{ locality: 'asc' }, { publicId: 'asc' }],
    })

    const byDate = new Map<
      string,
      { date: string; total: number; available: number; booked: number; unavailable: number }
    >()
    for (const window of schedule) {
      byDate.set(window.date, {
        date: window.date,
        total: 0,
        available: 0,
        booked: 0,
        unavailable: 0,
      })
    }

    const screensOut = screens.map((screen) => {
      const inactive = screen.status !== ScreenStatus.Active
      let status: ScreenAvailabilityStatus = 'available'
      let blockedUntil: string | null = null
      let holdExpiresAt: string | null = null

      if (inactive) {
        status = 'unavailable'
      } else {
        const blocking = screen.bookings.filter((booking) => {
          if (
            booking.status === ScreenBookingStatus.Hold &&
            booking.companyId === user.companyId
          ) {
            return false
          }
          return schedule.some((window) => bookingBlocksWindow(booking, window, now))
        })
        if (blocking.length) {
          status = 'booked'
          const soonest = blocking.reduce((min, row) => (row.endAt < min ? row.endAt : min), blocking[0].endAt)
          blockedUntil = soonest.toISOString()
          const hold = blocking.find((row) => row.status === ScreenBookingStatus.Hold)
          if (hold?.holdExpiresAt) holdExpiresAt = hold.holdExpiresAt.toISOString()
        }
      }

      for (const window of schedule) {
        const bucket = byDate.get(window.date)!
        bucket.total += 1
        if (inactive) bucket.unavailable += 1
        else if (
          screen.bookings.some((booking) => {
            if (booking.status === ScreenBookingStatus.Hold && booking.companyId === user.companyId) {
              return false
            }
            return bookingBlocksWindow(booking, window, now)
          })
        ) {
          bucket.booked += 1
        } else bucket.available += 1
      }

      return {
        id: screen.id,
        publicId: screen.publicId,
        autoId: screen.autoId,
        city: screen.city,
        locality: screen.locality,
        latitude: screen.latitude,
        longitude: screen.longitude,
        label: screen.label || screen.publicId,
        deviceStatus: screen.status,
        availability: status,
        blockedUntil,
        holdExpiresAt,
      }
    })

    const total = screensOut.length
    const unavailable = screensOut.filter((row) => row.availability === 'unavailable').length
    const booked = screensOut.filter((row) => row.availability === 'booked').length
    const available = screensOut.filter((row) => row.availability === 'available').length

    const dateBreakdown = [...byDate.values()]
    const availabilityVaries =
      dateBreakdown.length > 1 &&
      new Set(dateBreakdown.map((row) => `${row.available}:${row.booked}`)).size > 1

    return {
      city: dto.city,
      localities: localities.length ? localities : [...new Set(screensOut.map((s) => s.locality))],
      timezone: dto.timezone || DEFAULT_TZ,
      startDate: dto.startDate,
      endDate: dto.endDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      daysOfWeek: dto.daysOfWeek || [],
      windowCount: schedule.length,
      summary: {
        total,
        available,
        booked,
        unavailable,
        selected: 0,
        remaining: available,
      },
      availabilityVaries,
      dateBreakdown: availabilityVaries || dateBreakdown.length > 1 ? dateBreakdown : [],
      screens: screensOut,
      note:
        total === 0
          ? 'No screens are registered for this city/locality in the inventory database.'
          : schedule.length === 0
            ? 'No schedule windows matched the selected dates and weekdays.'
            : null,
    }
  }

  async createHolds(user: AuthUserContext, dto: CreateHoldsDto) {
    const schedule = this.assertAndExpandSchedule(dto)
    if (!dto.screenIds.length) throw new BadRequestException('Select at least one screen')

    await this.expireStaleHolds()

    const expiresAt = new Date(Date.now() + HOLD_TTL_MS)

    return this.prisma.$transaction(async (tx) => {
      // Drop this company's previous open holds for a clean re-hold.
      await tx.screenBooking.updateMany({
        where: {
          companyId: user.companyId,
          status: ScreenBookingStatus.Hold,
        },
        data: { status: ScreenBookingStatus.Expired },
      })

      const screens = await tx.adScreen.findMany({
        where: { id: { in: dto.screenIds } },
        include: {
          bookings: {
            where: {
              status: {
                in: [ScreenBookingStatus.Hold, ScreenBookingStatus.Reserved, ScreenBookingStatus.Confirmed],
              },
            },
          },
        },
      })

      if (screens.length !== dto.screenIds.length) {
        throw new BadRequestException('One or more selected screens were not found')
      }

      const conflicts: { screenId: string; publicId: string; date: string }[] = []
      const now = new Date()

      for (const screen of screens) {
        if (screen.status !== ScreenStatus.Active) {
          conflicts.push({ screenId: screen.id, publicId: screen.publicId, date: dto.startDate })
          continue
        }
        for (const window of schedule) {
          const blocked = screen.bookings.some((booking) => bookingBlocksWindow(booking, window, now))
          if (blocked) {
            conflicts.push({ screenId: screen.id, publicId: screen.publicId, date: window.date })
            break
          }
        }
      }

      if (conflicts.length) {
        throw new ConflictException({
          message: 'Some selected screens are no longer available for the requested schedule.',
          conflicts,
        })
      }

      const created = []
      for (const screen of screens) {
        for (const window of schedule) {
          created.push(
            await tx.screenBooking.create({
              data: {
                screenId: screen.id,
                companyId: user.companyId,
                startAt: window.startAt,
                endAt: window.endAt,
                status: ScreenBookingStatus.Hold,
                holdExpiresAt: expiresAt,
                timezone: dto.timezone || DEFAULT_TZ,
                daysOfWeek: dto.daysOfWeek || [],
              },
            }),
          )
        }
      }

      return {
        holdCount: created.length,
        screenCount: screens.length,
        expiresAt: expiresAt.toISOString(),
        ttlSeconds: Math.floor(HOLD_TTL_MS / 1000),
        screenIds: screens.map((s) => s.id),
      }
    })
  }

  async validateSelection(user: AuthUserContext, dto: ValidateSelectionDto) {
    const result = await this.queryAvailability(user, {
      city: dto.city,
      localities: dto.localities,
      startDate: dto.startDate,
      endDate: dto.endDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      timezone: dto.timezone,
      daysOfWeek: dto.daysOfWeek,
    })

    const byId = new Map(result.screens.map((s) => [s.id, s]))
    const conflicts = dto.screenIds
      .map((id) => {
        const screen = byId.get(id)
        if (!screen) return { screenId: id, publicId: id, reason: 'Screen not found' }
        if (screen.availability !== 'available') {
          return {
            screenId: id,
            publicId: screen.publicId,
            reason:
              screen.availability === 'unavailable'
                ? `Screen is ${screen.deviceStatus.toLowerCase()}`
                : 'Screen is booked for an overlapping period',
            date: dto.startDate,
          }
        }
        return null
      })
      .filter(Boolean)

    return {
      ok: conflicts.length === 0,
      conflicts,
      summary: {
        ...result.summary,
        selected: dto.screenIds.length,
        remaining: Math.max(0, result.summary.available - dto.screenIds.length),
      },
      holdExpiresHintMinutes: HOLD_TTL_MS / 60_000,
    }
  }

  /**
   * Convert holds to Reserved/Confirmed when a campaign is submitted, or skip for drafts.
   * Must run inside a transaction with the campaign create.
   */
  async reserveScreensForCampaign(
    tx: Prisma.TransactionClient,
    input: {
      companyId: string
      campaignId: string
      screenIds: string[]
      startDate: string
      endDate: string
      startTime: string
      endTime: string
      daysOfWeek: string[]
      timezone?: string
      permanent: boolean
    },
  ) {
    if (!input.screenIds.length) return { reserved: 0 }

    const schedule = expandScheduleWindows({
      startDate: input.startDate,
      endDate: input.endDate,
      startTime: input.startTime,
      endTime: input.endTime,
      daysOfWeek: input.daysOfWeek.length ? input.daysOfWeek : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    })
    if (!schedule.length) {
      throw new BadRequestException('No valid schedule windows for inventory reservation')
    }

    await tx.screenBooking.updateMany({
      where: { companyId: input.companyId, status: ScreenBookingStatus.Hold },
      data: { status: ScreenBookingStatus.Expired },
    })

    const now = new Date()
    const screens = await tx.adScreen.findMany({
      where: { id: { in: input.screenIds } },
      include: {
        bookings: {
          where: {
            status: {
              in: [ScreenBookingStatus.Hold, ScreenBookingStatus.Reserved, ScreenBookingStatus.Confirmed],
            },
          },
        },
      },
    })

    if (screens.length !== input.screenIds.length) {
      throw new BadRequestException('One or more selected screens were not found')
    }

    const conflicts: { publicId: string; date: string }[] = []
    for (const screen of screens) {
      if (screen.status !== ScreenStatus.Active) {
        conflicts.push({ publicId: screen.publicId, date: input.startDate })
        continue
      }
      for (const window of schedule) {
        if (screen.bookings.some((b) => bookingBlocksWindow(b, window, now))) {
          conflicts.push({ publicId: screen.publicId, date: window.date })
          break
        }
      }
    }
    if (conflicts.length) {
      throw new ConflictException({
        message: 'Inventory conflict while booking screens.',
        conflicts,
      })
    }

    if (!input.permanent) {
      // Draft: do not permanently reserve inventory.
      return { reserved: 0, draft: true }
    }

    let reserved = 0
    for (const screen of screens) {
      for (const window of schedule) {
        await tx.screenBooking.create({
          data: {
            screenId: screen.id,
            companyId: input.companyId,
            campaignId: input.campaignId,
            startAt: window.startAt,
            endAt: window.endAt,
            status: ScreenBookingStatus.Reserved,
            timezone: input.timezone || DEFAULT_TZ,
            daysOfWeek: input.daysOfWeek,
          },
        })
        reserved += 1
      }
    }
    return { reserved }
  }

  private assertAndExpandSchedule(dto: {
    startDate: string
    endDate: string
    startTime: string
    endTime: string
    daysOfWeek?: string[]
  }): ScheduleWindow[] {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('End date must be on or after the start date')
    }
    const startMin = parseHmToMinutes(dto.startTime)
    const endMin = parseHmToMinutes(dto.endTime)
    if (startMin == null || endMin == null) {
      throw new BadRequestException('Invalid start or end time')
    }
    if (endMin <= startMin) {
      throw new BadRequestException('End time must be later than start time')
    }
    const days =
      dto.daysOfWeek && dto.daysOfWeek.length
        ? dto.daysOfWeek
        : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    const windows = expandScheduleWindows({
      startDate: dto.startDate,
      endDate: dto.endDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      daysOfWeek: days,
    })
    if (!windows.length) {
      throw new BadRequestException('No schedule windows match the selected dates and weekdays')
    }
    return windows
  }

  private async expireStaleHolds() {
    await this.prisma.screenBooking.updateMany({
      where: {
        status: ScreenBookingStatus.Hold,
        holdExpiresAt: { lte: new Date() },
      },
      data: { status: ScreenBookingStatus.Expired },
    })
  }
}
