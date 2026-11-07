import type {
  ActivityEvent,
  Campaign,
  CampaignStatusEvent,
  Creative,
  Invoice,
  LocationPlayback,
  Notification,
  Payment,
  PlaybackDaily,
  PlaybackReport,
} from '@prisma/client'

const MEASUREMENT_NOTE =
  'Successful ad plays are Proof of Play from auto-rickshaw screens. Estimated reach is a modelled audience estimate — not verified human impressions.'

function mapStatus(status: string) {
  return status.replace(/([a-z])([A-Z])/g, '$1 $2').replace('UnderReview', 'Under Review').replace('RevisionRequired', 'Revision Required')
}

/** Normalize Prisma enum-ish strings to frontend labels */
export function toUiStatus(status: string) {
  const map: Record<string, string> = {
    Draft: 'Draft',
    Submitted: 'Submitted',
    UnderReview: 'Under Review',
    RevisionRequired: 'Revision Required',
    Approved: 'Approved',
    Scheduled: 'Scheduled',
    Live: 'Live',
    Paused: 'Paused',
    Completed: 'Completed',
    Rejected: 'Rejected',
    Cancelled: 'Cancelled',
    NotStarted: 'Not started',
    Pending: 'Pending',
    Authorized: 'Authorized',
    Paid: 'Paid',
    Failed: 'Failed',
    Refunded: 'Refunded',
    PartiallyRefunded: 'Partially Refunded',
    PendingModeration: 'Pending moderation',
  }
  return map[status] ?? mapStatus(status)
}

export function mapCampaign(row: Campaign & { creative?: Creative | null }) {
  return {
    id: row.publicId,
    dbId: row.id,
    name: row.name,
    status: toUiStatus(row.status),
    approvalStatus: toUiStatus(row.approvalStatus),
    deliveryStatus: toUiStatus(row.deliveryStatus),
    paymentStatus: toUiStatus(row.paymentStatus),
    startDate: row.startDate ? row.startDate.toISOString().slice(0, 10) : '',
    endDate: row.endDate ? row.endDate.toISOString().slice(0, 10) : '',
    locations: row.locations,
    requestedAutos: row.requestedAutos,
    allocatedAutos: row.allocatedAutos,
    budgetInr: row.budgetInr,
    estimatedReach: row.estimatedReach,
    creativeName: row.creative?.fileName ?? '—',
    creativeId: row.creativeId,
    scheduledPlays: row.scheduledPlays,
  }
}

export function mapWorkspace(input: {
  campaigns: (Campaign & { creative: Creative | null })[]
  events: (CampaignStatusEvent & { campaign: Campaign })[]
  invoices: Invoice[]
  payments: Payment[]
  notifications: Notification[]
  creatives: Creative[]
  activities: ActivityEvent[]
  daily: PlaybackDaily[]
  reports: (PlaybackReport & { campaign: Campaign })[]
  locations: LocationPlayback[]
}) {
  const successfulPlays = input.daily.reduce((sum, row) => sum + row.completedPlays, 0)
  const failedPlays = input.daily.reduce((sum, row) => sum + row.failedPlays, 0)
  const playbackStarts = input.daily.reduce((sum, row) => sum + row.playbackStarts, 0)
  const scheduledPlays = input.daily.reduce((sum, row) => sum + row.scheduledPlays, 0)
  const estimatedReach = input.campaigns.reduce((sum, row) => sum + row.estimatedReach, 0)
  const expenditure = input.payments
    .filter((row) => row.status === 'Paid')
    .reduce((sum, row) => sum + row.amountInr, 0)

  return {
    campaigns: input.campaigns.map(mapCampaign),
    approvalTracking: input.events.map((event) => ({
      id: event.id,
      campaignId: event.campaign.publicId,
      campaignName: event.campaign.name,
      previousStatus: event.previousStatus ? toUiStatus(event.previousStatus) : null,
      status: toUiStatus(event.status),
      at: event.createdAt.toLocaleString('en-IN'),
      note: event.note,
      actorLabel: event.actorLabel || 'System',
    })),
    analytics: {
      totalTargetedDevices: input.campaigns.reduce((sum, row) => sum + row.requestedAutos, 0),
      activeDevices: input.campaigns.reduce((sum, row) => sum + row.allocatedAutos, 0),
      playbackStarts,
      completedAdvertisements: successfulPlays,
      interruptedAdvertisements: failedPlays,
      playbackCompletionRate: playbackStarts > 0 ? Math.round((successfulPlays / playbackStarts) * 1000) / 10 : 0,
      campaignRunningHours: input.reports.reduce((sum, row) => sum + row.runningHours, 0),
      campaignExpenditureInr: expenditure,
      estimatedReach,
    },
    livePerformanceTrend: input.daily.map((row) => ({
      date: row.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      playbackStarts: row.playbackStarts,
      completedPlays: row.completedPlays,
      failedPlays: row.failedPlays,
      scheduledPlays: row.scheduledPlays,
    })),
    playbackReports: input.reports.map((row) => ({
      campaignId: row.campaign.publicId,
      campaignName: row.campaign.name,
      period: row.periodLabel,
      targetedDevices: row.targetedDevices,
      activeDevices: row.activeDevices,
      playbackStarts: row.playbackStarts,
      completedPlays: row.completedPlays,
      interruptedPlays: row.interruptedPlays,
      completionRate: row.completionRate,
      runningHours: row.runningHours,
      expenditureInr: row.expenditureInr,
    })),
    geographicDistribution: input.locations.map((row) => ({
      area: row.area,
      completedPlays: row.completedPlays,
      targetedDevices: row.targetedDevices,
    })),
    invoices: input.invoices.map((row) => ({
      id: row.publicId,
      campaignName: row.campaignName,
      amountInr: row.amountInr,
      paymentStatus: toUiStatus(row.paymentStatus),
      issuedOn: row.issuedOn.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    })),
    paymentHistory: input.payments.map((row) => ({
      id: row.publicId,
      date: row.paidOn.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      reference: row.reference,
      campaignName: row.campaignName,
      amountInr: row.amountInr,
      status: toUiStatus(row.status),
    })),
    notifications: input.notifications.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      at: row.createdAt.toLocaleString('en-IN'),
      read: row.read,
      category: row.category,
      campaignId: row.campaignId ?? undefined,
    })),
    creatives: input.creatives.map((row) => ({
      id: row.id,
      name: row.fileName,
      type: row.type,
      size: row.sizeLabel,
      spec: row.spec,
      status: toUiStatus(row.moderationStatus) as
        | 'Approved'
        | 'Revision Required'
        | 'Draft'
        | 'Pending moderation',
      version: row.version,
      campaign: 'Library',
      previewNote: row.previewNote,
      campaignId: undefined,
      previewUrl: row.previewUrl || undefined,
      uploadedAt: row.createdAt.toLocaleString('en-IN'),
    })),
    activity: input.activities.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      at: row.createdAt.toLocaleString('en-IN'),
      sortAt: row.createdAt.getTime(),
      kind: row.kind,
    })),
    scheduledPlaysTotal: scheduledPlays,
    measurementNote: MEASUREMENT_NOTE,
  }
}
