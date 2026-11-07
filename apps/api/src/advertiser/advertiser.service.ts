import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthUserContext } from '../auth/auth.types'
import { mapWorkspace, toUiStatus } from './workspace.mapper'

@Injectable()
export class AdvertiserService {
  constructor(private readonly prisma: PrismaService) {}

  /** Never trust a companyId from the client — always use JWT membership. */
  assertCompany(user: AuthUserContext, companyId?: string) {
    if (companyId && companyId !== user.companyId) {
      throw new ForbiddenException('Company access denied')
    }
    return user.companyId
  }

  async getWorkspace(user: AuthUserContext) {
    const companyId = user.companyId
    if (!companyId) throw new ForbiddenException('Advertiser company membership required')

    const [campaigns, events, invoices, payments, notifications, creatives, activities, daily, reports, locations, company] =
      await Promise.all([
        this.prisma.campaign.findMany({
          where: { companyId },
          include: { creative: true },
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.campaignStatusEvent.findMany({
          where: { campaign: { companyId } },
          include: { campaign: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        this.prisma.invoice.findMany({ where: { companyId }, orderBy: { issuedOn: 'desc' }, take: 20 }),
        this.prisma.payment.findMany({ where: { companyId }, orderBy: { paidOn: 'desc' }, take: 20 }),
        this.prisma.notification.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' }, take: 30 }),
        this.prisma.creative.findMany({
          where: { companyId, archived: false },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.activityEvent.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' }, take: 40 }),
        this.prisma.playbackDaily.findMany({ where: { companyId }, orderBy: { date: 'asc' }, take: 30 }),
        this.prisma.playbackReport.findMany({
          where: { companyId },
          include: { campaign: true },
          orderBy: { periodLabel: 'desc' },
        }),
        this.prisma.locationPlayback.findMany({ where: { companyId }, orderBy: { area: 'asc' } }),
        this.prisma.company.findUnique({
          where: { id: companyId },
          include: { documents: true },
        }),
      ])

    if (!company) throw new NotFoundException('Company not found')

    return {
      company: {
        id: company.id,
        legalName: company.legalName,
        tradeName: company.tradeName,
        city: company.city,
        verificationStatus: toUiStatus(company.verificationStatus),
        verificationNotes: company.verificationNotes,
        documents: company.documents.map((doc) => ({
          label: doc.label,
          status: doc.status,
        })),
      },
      ...mapWorkspace({
        campaigns,
        events,
        invoices,
        payments,
        notifications,
        creatives,
        activities,
        daily,
        reports,
        locations,
      }),
    }
  }
}
