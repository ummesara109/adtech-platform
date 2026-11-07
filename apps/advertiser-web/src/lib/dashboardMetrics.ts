import type { AdvertiserWorkspaceSnapshot } from '../api/advertiserWorkspace'
import type { CampaignRow, CampaignStatus, PerformancePoint, VerificationRecord } from '../types/advertiser'
import { deriveApprovalStatus, deriveDeliveryStatus, LIFECYCLE_STATUSES } from './campaignLifecycle'
import { parseDisplayDate } from './format'
import { inventoryAreas } from '../data/campaignWizard'

export type AttentionItem = {
  id: string
  kind: 'approval' | 'creative' | 'payment' | 'ending' | 'booking' | 'kyc' | 'draft'
  title: string
  body: string
  to: string
  action: string
}

export type ActivityItem = {
  id: string
  title: string
  body: string
  at: string
  sortAt: number
  kind: 'campaign' | 'creative' | 'approval' | 'payment' | 'booking' | 'account'
}

export type DashboardRangePreset = 'today' | '7d' | '30d' | '90d' | 'custom' | 'all'

export type DashboardRange = {
  preset: DashboardRangePreset
  from: string
  to: string
}

export type ScheduleItem = {
  id: string
  name: string
  status: CampaignStatus
  startDate: string
  endDate: string
  locations: string[]
  note: string
}

export type OnboardingStep = {
  id: string
  label: string
  done: boolean
  to: string
  action: string
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function daysUntil(iso: string, from = new Date()) {
  if (!iso) return null
  const end = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(end.getTime())) return null
  return Math.round((end.getTime() - startOfDay(from).getTime()) / 86_400_000)
}

/** Derive dashboard KPIs only from advertiser-scoped workspace data — never invent plays or spend. */
export function buildDashboardMetrics(
  workspace: AdvertiserWorkspaceSnapshot,
  brandName: string,
  verification?: VerificationRecord,
) {
  const {
    campaigns,
    invoices,
    paymentHistory,
    playbackReports,
    analytics,
    livePerformanceTrend,
    creatives,
    approvalTracking,
    activity,
    geographicDistribution,
  } = workspace

  const totalCampaigns = campaigns.length
  const liveCampaigns = campaigns.filter((campaign) => campaign.status === 'Live').length
  const scheduledCampaigns = campaigns.filter((campaign) => campaign.status === 'Scheduled').length
  const completedCampaigns = campaigns.filter((campaign) => campaign.status === 'Completed').length
  const draftCampaigns = campaigns.filter((campaign) => campaign.status === 'Draft').length
  const pausedCampaigns = campaigns.filter((campaign) => campaign.status === 'Paused').length
  const isNewAdvertiser = totalCampaigns === 0 && invoices.length === 0 && playbackReports.length === 0

  const allocatedAutos = sum(campaigns.map((campaign) => campaign.allocatedAutos || 0))
  const requestedAutos = sum(campaigns.map((campaign) => campaign.requestedAutos || 0))
  const estimatedReach = analytics.estimatedReach || sum(campaigns.map((c) => c.estimatedReach || 0))

  const successfulPlays = analytics.completedAdvertisements || sum(playbackReports.map((row) => row.completedPlays))
  const failedPlays = analytics.interruptedAdvertisements || sum(playbackReports.map((row) => row.interruptedPlays))
  const playbackStarts = analytics.playbackStarts || sum(playbackReports.map((row) => row.playbackStarts))
  const scheduledPlaysFromCampaigns = sum(
    campaigns.map((campaign) => (typeof campaign.scheduledPlays === 'number' ? campaign.scheduledPlays : 0)),
  )
  /** Scheduled plays are never counted as successful plays. */
  const scheduledPlays = scheduledPlaysFromCampaigns > 0 ? scheduledPlaysFromCampaigns : null
  const deliveryPercent =
    playbackStarts > 0
      ? Math.round((successfulPlays / playbackStarts) * 1000) / 10
      : analytics.playbackCompletionRate || null

  const allocatedBudget = sum(campaigns.map((campaign) => campaign.budgetInr || 0))
  const paidFromInvoices = sum(
    invoices.filter((invoice) => invoice.paymentStatus === 'Paid').map((invoice) => invoice.amountInr),
  )
  const paidFromPayments = sum(
    paymentHistory.filter((row) => row.status === 'Paid').map((row) => row.amountInr),
  )
  // Settled spend only — never treat planned campaign budgets as money spent.
  const amountSpent =
    paidFromPayments > 0 ? paidFromPayments : paidFromInvoices > 0 ? paidFromInvoices : 0
  const pendingPayments = sum(
    invoices
      .filter((invoice) => invoice.paymentStatus === 'Authorized' || invoice.paymentStatus === 'Pending')
      .map((invoice) => invoice.amountInr),
  )
  const remainingBudget = Math.max(0, allocatedBudget - amountSpent)

  const statusOverview = LIFECYCLE_STATUSES.map((status) => ({
    status,
    count: campaigns.filter((campaign) => campaign.status === status).length,
  }))

  const selectedLocations = [...new Set(campaigns.flatMap((campaign) => campaign.locations))]
  const availableScreens = sum(inventoryAreas.map((area) => area.availableDevices))
  const inventorySynced = availableScreens > 0

  const scheduleItems: ScheduleItem[] = campaigns
    .filter((campaign) =>
      ['Approved', 'Scheduled', 'Live', 'Paused'].includes(campaign.status) &&
      Boolean(campaign.startDate || campaign.endDate),
    )
    .map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      locations: campaign.locations,
      note:
        campaign.status === 'Live'
          ? 'Active on allocated screens during operating hours'
          : campaign.status === 'Scheduled'
            ? 'Awaiting activation after payment, approval, and booking checks'
            : campaign.status === 'Paused'
              ? 'Paused — delivery stopped until resumed'
              : 'Approved — scheduling and booking still required before Live',
    }))
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))

  return {
    brandName,
    totalCampaigns,
    liveCampaigns,
    scheduledCampaigns,
    completedCampaigns,
    draftCampaigns,
    pausedCampaigns,
    isNewAdvertiser,
    onboarding: buildOnboarding(verification, totalCampaigns, creatives.length),
    scheduleItems,
    allocatedAutos,
    requestedAutos,
    estimatedReach,
    successfulPlays,
    failedPlays,
    scheduledPlays,
    playbackStarts,
    deliveryPercent,
    allocatedBudget,
    amountSpent,
    pendingPayments,
    remainingBudget,
    statusOverview,
    trend: livePerformanceTrend,
    geographicDistribution,
    deliveryByCampaign: playbackReports.map((row) => ({
      id: row.campaignId,
      name: row.campaignName,
      completed: row.completedPlays,
      starts: row.playbackStarts,
      rate: row.completionRate,
      spend: row.expenditureInr,
    })),
    campaigns: campaigns.map((campaign) => ({
      ...campaign,
      approvalStatus: campaign.approvalStatus || deriveApprovalStatus(campaign.status),
      deliveryStatus: campaign.deliveryStatus || deriveDeliveryStatus(campaign.status),
      creativeName: campaign.creativeName || '—',
      paymentStatus: campaign.paymentStatus || 'Pending',
    })),
    recentInvoices: invoices.slice(0, 5),
    recentTransactions: paymentHistory.slice(0, 5),
    attention: buildAttention(workspace, verification),
    activity: activity.length
      ? activity
      : buildActivityFromWorkspace(approvalTracking, invoices, workspace.notifications),
    creatives,
    inventory: {
      allocatedAutos,
      requestedAutos,
      availableScreens: inventorySynced ? availableScreens : null,
      selectedLocations,
      inventorySynced,
      note: inventorySynced
        ? null
        : 'Live screen capacity is not synced yet. Online/offline device health is not shown until monitoring is connected.',
    },
  }
}

function buildAttention(
  workspace: AdvertiserWorkspaceSnapshot,
  verification?: VerificationRecord,
): AttentionItem[] {
  const items: AttentionItem[] = []
  const { campaigns, creatives, invoices } = workspace

  campaigns
    .filter((campaign) => campaign.status === 'Draft')
    .forEach((campaign) => {
      items.push({
        id: `draft-${campaign.id}`,
        kind: 'draft',
        title: 'Draft campaign',
        body: `${campaign.name} is still a draft — finish setup when ready.`,
        to: `/campaigns/${campaign.id}`,
        action: 'Continue',
      })
    })

  campaigns
    .filter((campaign) => campaign.status === 'Paused')
    .forEach((campaign) => {
      items.push({
        id: `paused-${campaign.id}`,
        kind: 'booking',
        title: 'Campaign paused',
        body: `${campaign.name} is paused. Resume when you are ready.`,
        to: `/campaigns/${campaign.id}`,
        action: 'Open',
      })
    })

  invoices
    .filter((invoice) => invoice.paymentStatus === 'Pending' || invoice.paymentStatus === 'Authorized')
    .forEach((invoice) => {
      items.push({
        id: `pay-${invoice.id}`,
        kind: 'payment',
        title: 'Billing item open',
        body: `${invoice.id} · ${invoice.campaignName} is ${invoice.paymentStatus.toLowerCase()}.`,
        to: '/billing',
        action: 'View billing',
      })
    })

  // Keep creatives array referenced so future admin revision hooks can plug in without unused vars.
  void creatives
  void verification

  campaigns
    .filter((campaign) => campaign.status === 'Scheduled')
    .forEach((campaign) => {
      items.push({
        id: `booking-${campaign.id}`,
        kind: 'booking',
        title: 'Scheduled campaign',
        body: `${campaign.name} starts ${campaign.startDate || 'soon'}. Fleet allocation stays disconnected until inventory is live.`,
        to: `/campaigns/${campaign.id}`,
        action: 'View',
      })
    })

  campaigns
    .filter((campaign) => campaign.status === 'Live' && campaign.endDate)
    .forEach((campaign) => {
      const remaining = daysUntil(campaign.endDate)
      if (remaining == null || remaining < 0 || remaining > 14) return
      items.push({
        id: `ending-${campaign.id}`,
        kind: 'ending',
        title: 'Campaign ending soon',
        body: `${campaign.name} ends in ${remaining} day${remaining === 1 ? '' : 's'}.`,
        to: `/campaigns/${campaign.id}`,
        action: 'View campaign',
      })
    })

  return items
}

function buildActivityFromWorkspace(
  approvalTracking: AdvertiserWorkspaceSnapshot['approvalTracking'],
  invoices: AdvertiserWorkspaceSnapshot['invoices'],
  notifications: AdvertiserWorkspaceSnapshot['notifications'],
): ActivityItem[] {
  const items: ActivityItem[] = []

  approvalTracking.forEach((event) => {
    const date = parseDisplayDate(event.at)
    const title =
      event.status === 'Live'
        ? 'Campaign activated'
        : event.status === 'Scheduled'
          ? 'Campaign scheduled'
          : event.status === 'Approved'
            ? 'Campaign approved'
            : event.status === 'Completed'
              ? 'Campaign completed'
              : event.status === 'Submitted'
                ? 'Campaign submitted'
                : `Campaign ${event.status}`
    items.push({
      id: `appr-${event.id}`,
      title,
      body: `${event.campaignName}. ${event.note}`,
      at: event.at,
      sortAt: date?.getTime() ?? 0,
      kind: event.status === 'Revision Required' ? 'creative' : 'approval',
    })
  })

  invoices.forEach((invoice) => {
    const date = parseDisplayDate(invoice.issuedOn)
    items.push({
      id: `inv-${invoice.id}`,
      title: invoice.paymentStatus === 'Paid' ? 'Payment completed' : `Invoice ${invoice.paymentStatus}`,
      body: `${invoice.id} · ${invoice.campaignName}`,
      at: invoice.issuedOn,
      sortAt: date?.getTime() ?? 0,
      kind: 'payment',
    })
  })

  notifications.forEach((note) => {
    const date = parseDisplayDate(note.at)
    items.push({
      id: `note-${note.id}`,
      title: note.title,
      body: note.body,
      at: note.at,
      sortAt: date?.getTime() ?? 0,
      kind: 'account',
    })
  })

  return items.sort((a, b) => b.sortAt - a.sortAt)
}

export function filterTrend(points: PerformancePoint[], range: DashboardRange) {
  if (range.preset === 'all' || points.length === 0) return points
  const parsed = points.map((point) => ({
    point,
    date: parseDisplayDate(`${point.date} 2026`) ?? parseDisplayDate(point.date),
  }))
  const available = parsed.filter((row) => row.date)
  if (available.length === 0) return points

  if (range.preset === 'custom' && range.from && range.to) {
    const start = startOfDay(new Date(range.from))
    const end = startOfDay(new Date(range.to))
    end.setHours(23, 59, 59, 999)
    return parsed.filter((row) => row.date && row.date >= start && row.date <= end).map((row) => row.point)
  }

  const latest = available.reduce((max, row) => (row.date! > max ? row.date! : max), available[0].date!)
  const from = new Date(latest)

  if (range.preset === 'today') {
    from.setHours(0, 0, 0, 0)
    const end = new Date(from)
    end.setHours(23, 59, 59, 999)
    return parsed.filter((row) => row.date && row.date >= from && row.date <= end).map((row) => row.point)
  }
  if (range.preset === '7d') from.setDate(from.getDate() - 6)
  else if (range.preset === '30d') from.setDate(from.getDate() - 29)
  else if (range.preset === '90d') from.setDate(from.getDate() - 89)

  from.setHours(0, 0, 0, 0)
  return parsed.filter((row) => row.date && row.date >= from).map((row) => row.point)
}

function buildOnboarding(
  _verification: VerificationRecord | undefined,
  campaignCount: number,
  creativeCount: number,
): OnboardingStep[] {
  return [
    {
      id: 'company',
      label: 'Complete company profile',
      done: true,
      to: '/settings',
      action: 'Open settings',
    },
    {
      id: 'creative',
      label: 'Add a creative to your library',
      done: creativeCount > 0,
      to: '/creatives',
      action: 'Open creatives',
    },
    {
      id: 'campaign',
      label: 'Create your first campaign',
      done: campaignCount > 0,
      to: '/campaigns/create',
      action: 'Create campaign',
    },
  ]
}

export function campaignMatches(campaign: CampaignRow & { brandName?: string }, query: string, status: string) {
  const haystack = `${campaign.name} ${campaign.brandName ?? ''} ${campaign.locations.join(' ')} ${campaign.id} ${campaign.creativeName ?? ''}`.toLowerCase()
  const matchesQuery = !query || haystack.includes(query.toLowerCase())
  const matchesStatus = status === 'all' || campaign.status === status
  return matchesQuery && matchesStatus
}

export const campaignFilterStatuses: Array<'all' | CampaignStatus> = [
  'all',
  ...LIFECYCLE_STATUSES,
]
