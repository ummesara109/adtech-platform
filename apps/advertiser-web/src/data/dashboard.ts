/**
 * Static seed exports kept for pages that still import module-level constants.
 * Advertiser-owned records start empty — no fabricated live campaigns or plays.
 * Prefer `useAdvertiserWorkspace()` for dashboard and module pages.
 */

import { emptyAnalytics, MEASUREMENT_NOTE } from '../api/advertiserWorkspace'
import type {
  AdvertiserAccount,
  AdvertiserAnalyticsKpis,
  ApprovalTrackingEvent,
  CampaignRow,
  InvoiceSummary,
  LocationDistribution,
  PaymentHistoryRow,
  PerformancePoint,
  PlaybackReportRow,
} from '../types/advertiser'

export const advertiserAccount: AdvertiserAccount = {
  fullName: 'Advertiser',
  companyName: 'Your company',
  city: 'Bengaluru',
  verificationStatus: 'Pending',
}

export const advertiserAnalytics: AdvertiserAnalyticsKpis = emptyAnalytics()

export const campaigns: CampaignRow[] = []

export const approvalTracking: ApprovalTrackingEvent[] = []

export const livePerformanceTrend: PerformancePoint[] = []

export const playbackReports: PlaybackReportRow[] = []

export const geographicDistribution: LocationDistribution[] = []

export const invoices: InvoiceSummary[] = []

export const paymentHistory: PaymentHistoryRow[] = []

export const measurementNote = MEASUREMENT_NOTE
