import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  ApprovalStatus,
  CampaignStatus,
  DeliveryStatus,
  PaymentStatus,
  Prisma,
  VerificationStatus,
} from '@prisma/client'
import type { AuthUserContext } from '../auth/auth.types'
import { InventoryService } from '../inventory/inventory.service'
import { PrismaService } from '../prisma/prisma.service'
import { mapCampaign, toUiStatus } from '../advertiser/workspace.mapper'
import type { CreateCampaignDto } from './dto/create-campaign.dto'
import type { ListCampaignsDto } from './dto/list-campaigns.dto'
import type { ListStatusEventsDto } from './dto/list-status-events.dto'

function parseTimeToMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

function assertOperatingHours(start: string, end: string) {
  const startMin = parseTimeToMinutes(start)
  const endMin = parseTimeToMinutes(end)
  if (startMin == null || endMin == null) {
    throw new BadRequestException('Invalid operating hours')
  }
  if (endMin <= startMin) {
    throw new BadRequestException('End time must be later than start time.')
  }
}

/** Map UI labels ("Under Review") to Prisma CampaignStatus enum values. */
export function toPrismaCampaignStatus(raw?: string): CampaignStatus | undefined {
  if (!raw || raw === 'all') return undefined
  const normalized = raw.trim().replace(/\s+/g, '')
  const aliases: Record<string, CampaignStatus> = {
    Draft: CampaignStatus.Draft,
    Submitted: CampaignStatus.Submitted,
    UnderReview: CampaignStatus.UnderReview,
    RevisionRequired: CampaignStatus.RevisionRequired,
    Approved: CampaignStatus.Approved,
    Scheduled: CampaignStatus.Scheduled,
    Live: CampaignStatus.Live,
    Paused: CampaignStatus.Paused,
    Completed: CampaignStatus.Completed,
    Rejected: CampaignStatus.Rejected,
    Cancelled: CampaignStatus.Cancelled,
  }
  return aliases[normalized]
}

function parseDayStart(iso?: string): Date | undefined {
  if (!iso) return undefined
  const d = new Date(`${iso}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function parseDayEnd(iso?: string): Date | undefined {
  if (!iso) return undefined
  const d = new Date(`${iso}T23:59:59.999Z`)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function actorFromUser(user: AuthUserContext) {
  return {
    actorUserId: user.userId,
    actorLabel: user.email ? `Advertiser · ${user.email}` : 'Advertiser',
  }
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  async list(user: AuthUserContext, query: ListCampaignsDto = {}) {
    const companyId = user.companyId
    if (!companyId) throw new ForbiddenException('Advertiser company membership required')

    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 10
    const status = toPrismaCampaignStatus(query.status)
    const q = query.q?.trim()
    const location = query.location?.trim()
    const from = parseDayStart(query.from)
    const to = parseDayEnd(query.to)

    const where: Prisma.CampaignWhereInput = {
      companyId,
      ...(status ? { status } : {}),
      ...(location && location !== 'all' ? { locations: { has: location } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { publicId: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    // Date filters: campaign window overlaps [from, to]
    if (from || to) {
      const dateAnd: Prisma.CampaignWhereInput[] = []
      if (from) {
        dateAnd.push({
          OR: [{ endDate: null }, { endDate: { gte: from } }],
        })
      }
      if (to) {
        dateAnd.push({
          OR: [{ startDate: null }, { startDate: { lte: to } }],
        })
      }
      // Exclude rows with neither start nor end when a date filter is applied
      dateAnd.push({
        OR: [{ startDate: { not: null } }, { endDate: { not: null } }],
      })
      where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), ...dateAnd]
    }

    const [total, rows, locationRows] = await Promise.all([
      this.prisma.campaign.count({ where }),
      this.prisma.campaign.findMany({
        where,
        include: { creative: true },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.campaign.findMany({
        where: { companyId },
        select: { locations: true },
      }),
    ])

    const locationSet = new Set<string>()
    locationRows.forEach((row) => row.locations.forEach((loc) => locationSet.add(loc)))

    return {
      items: rows.map(mapCampaign),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      locations: [...locationSet].sort((a, b) => a.localeCompare(b)),
    }
  }

  async listStatusEvents(user: AuthUserContext, query: ListStatusEventsDto = {}) {
    const companyId = user.companyId
    if (!companyId) throw new ForbiddenException('Advertiser company membership required')

    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const publicId = query.campaignId?.trim()

    const where: Prisma.CampaignStatusEventWhereInput = {
      campaign: {
        companyId,
        ...(publicId ? { publicId } : {}),
      },
    }

    const [total, rows] = await Promise.all([
      this.prisma.campaignStatusEvent.count({ where }),
      this.prisma.campaignStatusEvent.findMany({
        where,
        include: { campaign: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      items: rows.map((event) => ({
        id: event.id,
        campaignId: event.campaign.publicId,
        campaignName: event.campaign.name,
        previousStatus: event.previousStatus ? toUiStatus(event.previousStatus) : null,
        status: toUiStatus(event.status),
        note: event.note,
        actorLabel: event.actorLabel || 'System',
        at: event.createdAt.toISOString(),
        atDisplay: event.createdAt.toLocaleString('en-IN'),
      })),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    }
  }

  async getByPublicId(user: AuthUserContext, publicId: string) {
    const row = await this.prisma.campaign.findFirst({
      where: { companyId: user.companyId, publicId },
      include: {
        creative: true,
        events: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!row) throw new NotFoundException('Campaign not found')
    return {
      ...mapCampaign(row),
      description: row.description,
      timeline: row.events.map((event) => ({
        id: event.id,
        previousStatus: event.previousStatus ? toUiStatus(event.previousStatus) : null,
        status: toUiStatus(event.status),
        note: event.note,
        actorLabel: event.actorLabel || 'System',
        at: event.createdAt.toISOString(),
        atDisplay: event.createdAt.toLocaleString('en-IN'),
      })),
    }
  }

  async create(user: AuthUserContext, dto: CreateCampaignDto) {
    assertOperatingHours(dto.operatingStart, dto.operatingEnd)

    const company = await this.prisma.company.findUnique({ where: { id: user.companyId } })
    if (!company) throw new NotFoundException('Company not found')

    const submit = dto.submitMode === 'Submitted'
    if (submit && company.verificationStatus !== VerificationStatus.Verified) {
      throw new ForbiddenException('KYC must be Verified before submitting a campaign for approval')
    }

    if (dto.creativeId) {
      const creative = await this.prisma.creative.findFirst({
        where: { id: dto.creativeId, companyId: user.companyId, archived: false },
      })
      if (!creative) throw new BadRequestException('Creative not found in your library')
    }

    if (dto.startDate && dto.endDate && dto.endDate < dto.startDate) {
      throw new BadRequestException('End date must be on or after the start date')
    }

    const status = submit ? CampaignStatus.Submitted : CampaignStatus.Draft
    const approvalStatus = submit ? ApprovalStatus.Submitted : ApprovalStatus.Draft
    const publicId = `CAM-${Date.now().toString(36).toUpperCase()}`
    const selectedScreenIds = dto.selectedScreenIds ?? []
    const daysOfWeek = dto.daysOfWeek ?? []
    const actor = actorFromUser(user)

    if (selectedScreenIds.length && (!dto.startDate || !dto.endDate)) {
      throw new BadRequestException('Start and end dates are required when selecting screens')
    }

    if (selectedScreenIds.length && selectedScreenIds.length !== dto.requestedAutos) {
      throw new BadRequestException('Requested autos must match the number of selected screens')
    }

    const campaign = await this.prisma.$transaction(async (tx) => {
      const created = await tx.campaign.create({
        data: {
          publicId,
          companyId: user.companyId,
          name: dto.name.trim(),
          description: dto.description.trim(),
          status,
          approvalStatus,
          deliveryStatus: DeliveryStatus.NotStarted,
          paymentStatus: PaymentStatus.Pending,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          locations: dto.locations,
          selectedScreenIds,
          requestedAutos: dto.requestedAutos,
          allocatedAutos: 0,
          budgetInr: dto.campaignBudgetInr,
          estimatedReach: 0,
          creativeId: dto.creativeId,
          operatingStart: dto.operatingStart,
          operatingEnd: dto.operatingEnd,
          daysOfWeek,
          frequencyCap: dto.frequencyCap,
          events: {
            create: {
              previousStatus: null,
              status,
              actorLabel: actor.actorLabel,
              actorUserId: actor.actorUserId,
              note: submit
                ? 'Campaign submitted for admin approval. Submission is not approval, inventory allocation, or playback.'
                : 'Campaign draft saved. Inventory was not permanently reserved.',
            },
          },
        },
        include: { creative: true },
      })

      if (selectedScreenIds.length && dto.startDate && dto.endDate) {
        await this.inventory.reserveScreensForCampaign(tx, {
          companyId: user.companyId,
          campaignId: created.id,
          screenIds: selectedScreenIds,
          startDate: dto.startDate,
          endDate: dto.endDate,
          startTime: dto.operatingStart,
          endTime: dto.operatingEnd,
          daysOfWeek: daysOfWeek.length
            ? daysOfWeek
            : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          permanent: submit,
        })
      }

      await tx.activityEvent.create({
        data: {
          companyId: user.companyId,
          title: submit ? 'Campaign submitted' : 'Campaign created',
          body: `${created.name} (${created.publicId})`,
          kind: 'campaign',
        },
      })

      return created
    })

    return mapCampaign(campaign)
  }

  async updateStatus(
    user: AuthUserContext,
    publicId: string,
    action: 'pause' | 'resume' | 'cancel' | 'duplicate',
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { companyId: user.companyId, publicId },
      include: { creative: true },
    })
    if (!campaign) throw new NotFoundException('Campaign not found')
    const actor = actorFromUser(user)

    if (action === 'duplicate') {
      const copy = await this.prisma.campaign.create({
        data: {
          publicId: `CAM-${Date.now().toString(36).toUpperCase()}`,
          companyId: user.companyId,
          name: `${campaign.name} (copy)`,
          description: campaign.description,
          status: CampaignStatus.Draft,
          approvalStatus: ApprovalStatus.Draft,
          deliveryStatus: DeliveryStatus.NotStarted,
          paymentStatus: PaymentStatus.Pending,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          locations: campaign.locations,
          requestedAutos: campaign.requestedAutos,
          allocatedAutos: 0,
          budgetInr: campaign.budgetInr,
          estimatedReach: 0,
          creativeId: campaign.creativeId,
          operatingStart: campaign.operatingStart,
          operatingEnd: campaign.operatingEnd,
          frequencyCap: campaign.frequencyCap,
          events: {
            create: {
              previousStatus: null,
              status: CampaignStatus.Draft,
              actorLabel: actor.actorLabel,
              actorUserId: actor.actorUserId,
              note: `Duplicated from ${campaign.publicId}. Copy starts as Draft — not approved or live.`,
            },
          },
        },
        include: { creative: true },
      })
      return mapCampaign(copy)
    }

    let nextStatus = campaign.status
    let nextDelivery = campaign.deliveryStatus
    let note = ''

    if (action === 'pause') {
      if (campaign.deliveryStatus !== DeliveryStatus.Live && campaign.status !== CampaignStatus.Live) {
        throw new BadRequestException('Only Live campaigns can be paused')
      }
      nextStatus = CampaignStatus.Paused
      nextDelivery = DeliveryStatus.Paused
      note = 'Campaign paused by advertiser. Delivery stopped; not completed.'
    } else if (action === 'resume') {
      if (campaign.deliveryStatus !== DeliveryStatus.Paused && campaign.status !== CampaignStatus.Paused) {
        throw new BadRequestException('Only Paused campaigns can be resumed')
      }
      nextStatus = CampaignStatus.Live
      nextDelivery = DeliveryStatus.Live
      note = 'Campaign resumed by advertiser. Live status reflects delivery state after prior scheduling/activation.'
    } else if (action === 'cancel') {
      if (campaign.status === CampaignStatus.Completed || campaign.status === CampaignStatus.Live) {
        throw new BadRequestException('Cannot cancel a Live or Completed campaign from advertiser portal')
      }
      nextStatus = CampaignStatus.Cancelled
      nextDelivery = DeliveryStatus.Cancelled
      note = 'Campaign cancelled by advertiser.'
    }

    if (nextStatus === campaign.status && nextDelivery === campaign.deliveryStatus) {
      return mapCampaign(campaign)
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: nextStatus,
        deliveryStatus: nextDelivery,
        events: {
          create: {
            previousStatus: campaign.status,
            status: nextStatus,
            actorLabel: actor.actorLabel,
            actorUserId: actor.actorUserId,
            note,
          },
        },
      },
      include: { creative: true },
    })

    return mapCampaign(updated)
  }
}
