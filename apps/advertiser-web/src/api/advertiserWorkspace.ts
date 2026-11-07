/**
 * Advertiser workspace API — NestJS REST contracts.
 *
 * Production path:
 *   GET /api/v1/advertiser/workspace
 * Auth: Supabase JWT (Bearer)
 * AuthZ: NestJS guards + Postgres RLS scoped to the advertiser company
 *
 * Analytics plays may later come from ClickHouse via NestJS aggregation endpoints.
 * Creative assets are stored on S3 and served via CloudFront (media CDN URL).
 */

import type {
  AdvertiserAnalyticsKpis,
  ApprovalTrackingEvent,
  CampaignRow,
  InvoiceSummary,
  LocationDistribution,
  PaymentHistoryRow,
  PerformancePoint,
  PlaybackReportRow,
} from '../types/advertiser'
import { isApiConfigured } from '../lib/config'
import { apiRequest } from './httpClient'

export type AdvertiserNotification = {
  id: string
  title: string
  body: string
  at: string
  read: boolean
  category: string
  campaignId?: string
}

export type AdvertiserCreative = {
  id: string
  name: string
  type: 'Video' | 'Image'
  size: string
  /** Raw byte size when known (local uploads / optimized files). */
  sizeBytes?: number
  spec: string
  status: 'Approved' | 'Revision Required' | 'Draft' | 'Pending moderation'
  version: string
  campaign: string
  previewNote: string
  campaignId?: string
  previewUrl?: string
  uploadedAt?: string
}

export type AdvertiserActivity = {
  id: string
  title: string
  body: string
  at: string
  sortAt: number
  kind: 'campaign' | 'creative' | 'approval' | 'payment' | 'account'
}

export type AdvertiserWorkspaceSnapshot = {
  campaigns: CampaignRow[]
  approvalTracking: ApprovalTrackingEvent[]
  analytics: AdvertiserAnalyticsKpis
  livePerformanceTrend: PerformancePoint[]
  playbackReports: PlaybackReportRow[]
  geographicDistribution: LocationDistribution[]
  invoices: InvoiceSummary[]
  paymentHistory: PaymentHistoryRow[]
  notifications: AdvertiserNotification[]
  creatives: AdvertiserCreative[]
  activity: AdvertiserActivity[]
  measurementNote: string
}

export const MEASUREMENT_NOTE =
  'Successful ad plays are Proof of Play from auto-rickshaw screens (device telemetry via MQTT → NestJS → ClickHouse). Estimated reach is a modelled audience estimate — not verified human impressions.'

export const emptyAnalytics = (): AdvertiserAnalyticsKpis => ({
  totalTargetedDevices: 0,
  activeDevices: 0,
  playbackStarts: 0,
  completedAdvertisements: 0,
  interruptedAdvertisements: 0,
  playbackCompletionRate: 0,
  campaignRunningHours: 0,
  campaignExpenditureInr: 0,
  estimatedReach: 0,
})

export function emptyWorkspaceSnapshot(): AdvertiserWorkspaceSnapshot {
  return {
    campaigns: [],
    approvalTracking: [],
    analytics: emptyAnalytics(),
    livePerformanceTrend: [],
    playbackReports: [],
    geographicDistribution: [],
    invoices: [],
    paymentHistory: [],
    notifications: [],
    creatives: [],
    activity: [],
    measurementNote: MEASUREMENT_NOTE,
  }
}

/**
 * Load advertiser-scoped dashboard data.
 * Without VITE_API_BASE_URL, returns an empty workspace (no fabricated metrics).
 */
export async function fetchAdvertiserWorkspace(advertiserKey: string): Promise<AdvertiserWorkspaceSnapshot> {
  if (!advertiserKey) {
    throw new Error('Advertiser identity is required to load workspace data.')
  }

  if (!isApiConfigured()) {
    // Offline / pre-backend mode — honest empty state for the authenticated local workspace.
    await new Promise((resolve) => setTimeout(resolve, 220))
    return emptyWorkspaceSnapshot()
  }

  // NestJS resolves company from JWT membership — never trust advertiserKey as a company id.
  const remote = await apiRequest<Partial<AdvertiserWorkspaceSnapshot>>('/api/v1/advertiser/workspace')
  return {
    ...emptyWorkspaceSnapshot(),
    campaigns: remote.campaigns ?? [],
    approvalTracking: remote.approvalTracking ?? [],
    analytics: { ...emptyAnalytics(), ...remote.analytics },
    livePerformanceTrend: remote.livePerformanceTrend ?? [],
    playbackReports: remote.playbackReports ?? [],
    geographicDistribution: remote.geographicDistribution ?? [],
    invoices: remote.invoices ?? [],
    paymentHistory: remote.paymentHistory ?? [],
    notifications: remote.notifications ?? [],
    creatives: remote.creatives ?? [],
    activity: remote.activity ?? [],
    measurementNote: remote.measurementNote || MEASUREMENT_NOTE,
  }
}
