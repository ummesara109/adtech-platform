export const campaignStatuses = [
  'Draft',
  'Submitted',
  'Under Review',
  'Revision Required',
  'Approved',
  'Scheduled',
  'Live',
  'Paused',
  'Completed',
  'Rejected',
  'Cancelled',
] as const

export type CampaignStatus = (typeof campaignStatuses)[number]

export const paymentStatuses = [
  'Pending',
  'Authorized',
  'Paid',
  'Failed',
  'Refunded',
  'Partially Refunded',
] as const

export type PaymentStatus = (typeof paymentStatuses)[number]

export const verificationStatuses = [
  'Pending',
  'Under Review',
  'Verified',
  'Rejected',
] as const

export type VerificationStatus = (typeof verificationStatuses)[number]

/** §8 Advertiser Analytics — dashboard KPIs */
export type AdvertiserAnalyticsKpis = {
  totalTargetedDevices: number
  activeDevices: number
  playbackStarts: number
  completedAdvertisements: number
  interruptedAdvertisements: number
  playbackCompletionRate: number
  campaignRunningHours: number
  campaignExpenditureInr: number
  estimatedReach: number
}

export type CompanyProfile = {
  registeredOn: string
  legalName: string
  tradeName: string
  businessType: string
  gstin: string
  registeredAddress: string
  city: string
  contactName: string
  contactEmail: string
  contactPhone: string
  industry: string
}

export type VerificationRecord = {
  status: VerificationStatus
  submittedOn: string
  reviewedOn: string | null
  documents: { label: string; status: 'Submitted' | 'Approved' | 'Rejected' | 'Required' }[]
  notes: string
}

export type CampaignRow = {
  id: string
  name: string
  status: CampaignStatus
  startDate: string
  endDate: string
  locations: string[]
  requestedAutos: number
  allocatedAutos: number
  budgetInr: number
  estimatedReach: number
  /** Optional enrichment from NestJS workspace */
  creativeName?: string
  creativeId?: string | null
  approvalStatus?: string
  deliveryStatus?: string
  paymentStatus?: PaymentStatus | string
  scheduledPlays?: number | null
}

export type ApprovalTrackingEvent = {
  id: string
  campaignId: string
  campaignName: string
  status: CampaignStatus
  at: string
  note: string
  previousStatus?: string | null
  actorLabel?: string
}

export type PerformancePoint = {
  date: string
  playbackStarts: number
  completedPlays: number
}

export type PlaybackReportRow = {
  campaignId: string
  campaignName: string
  period: string
  targetedDevices: number
  activeDevices: number
  playbackStarts: number
  completedPlays: number
  interruptedPlays: number
  completionRate: number
  runningHours: number
  expenditureInr: number
}

export type LocationDistribution = {
  area: string
  completedPlays: number
  targetedDevices: number
}

export type InvoiceSummary = {
  id: string
  campaignName: string
  amountInr: number
  paymentStatus: PaymentStatus
  issuedOn: string
}

export type PaymentHistoryRow = {
  id: string
  date: string
  reference: string
  campaignName: string
  amountInr: number
  status: PaymentStatus
}

export type AdvertiserAccount = {
  fullName: string
  companyName: string
  city: string
  verificationStatus: VerificationStatus
}
