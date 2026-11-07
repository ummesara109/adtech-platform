import type { VerificationStatus } from '../types/advertiser'
import { isApiConfigured } from './config'

/**
 * Advertiser portal phase (current): submission does not wait on admin approval.
 * When a future admin portal is connected with API + Verified KYC enforcement,
 * flip ADVERTISER_ONLY_PHASE to false (or gate via env) to restore KYC-gated submit.
 */
export const ADVERTISER_ONLY_PHASE = true

/** Operations that historically required Verified KYC before admin review. */
export function canSubmitForApproval(status: VerificationStatus) {
  if (ADVERTISER_ONLY_PHASE || !isApiConfigured()) return true
  return status === 'Verified'
}

/** Draft campaign setup is allowed while KYC is pending or under review. */
export function canCreateCampaignDraft(status: VerificationStatus) {
  if (ADVERTISER_ONLY_PHASE) return status !== 'Rejected'
  return status !== 'Rejected'
}

export function verificationAccessMessage(status: VerificationStatus) {
  if (ADVERTISER_ONLY_PHASE) {
    return 'Advertiser-only phase: you can create and launch campaigns without admin approval. Company profile still helps keep your workspace labelled correctly.'
  }
  switch (status) {
    case 'Verified':
      return 'Business verification is complete. You can submit campaigns for admin approval.'
    case 'Under Review':
      return 'KYC is under review. You can prepare campaign drafts, but submission for approval stays locked until verification completes.'
    case 'Rejected':
      return 'KYC was rejected. Update company documents in Settings before creating or submitting campaigns.'
    case 'Pending':
    default:
      return 'Complete business onboarding in Settings. Dashboard browsing is available; campaign submission requires a Verified KYC status.'
  }
}

/** Resolve launch status from campaign dates (no admin queue). */
export function resolveAdvertiserLaunchStatus(startDate: string, endDate: string): 'Scheduled' | 'Live' | 'Completed' {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null
  if (end && !Number.isNaN(end.getTime()) && end < today) return 'Completed'
  if (start && !Number.isNaN(start.getTime()) && start > today) return 'Scheduled'
  if (start && end && start <= today && end >= today) return 'Live'
  if (start && start <= today) return 'Live'
  return 'Scheduled'
}
