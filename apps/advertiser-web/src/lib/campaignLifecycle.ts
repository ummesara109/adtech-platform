import type { CampaignStatus, PaymentStatus } from '../types/advertiser'

/** Creative / campaign admin review — separate from delivery on screens. */
export type ApprovalStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Revision Required'

/** On-vehicle delivery state — separate from approval and payment. */
export type DeliveryStatus =
  | 'Not started'
  | 'Scheduled'
  | 'Live'
  | 'Paused'
  | 'Completed'
  | 'Cancelled'

export function deriveApprovalStatus(status: CampaignStatus): ApprovalStatus {
  switch (status) {
    case 'Draft':
      return 'Draft'
    case 'Submitted':
      return 'Submitted'
    case 'Under Review':
      return 'Under Review'
    case 'Revision Required':
      return 'Revision Required'
    case 'Rejected':
      return 'Rejected'
    case 'Approved':
    case 'Scheduled':
    case 'Live':
    case 'Paused':
    case 'Completed':
    case 'Cancelled':
      return 'Approved'
    default:
      return 'Draft'
  }
}

export function deriveDeliveryStatus(status: CampaignStatus): DeliveryStatus {
  switch (status) {
    case 'Scheduled':
      return 'Scheduled'
    case 'Live':
      return 'Live'
    case 'Paused':
      return 'Paused'
    case 'Completed':
      return 'Completed'
    case 'Cancelled':
      return 'Cancelled'
    default:
      return 'Not started'
  }
}

/** Live only after approval + payment + booking + scheduling + activation. */
export function canMarkLive(input: {
  approvalStatus: ApprovalStatus
  paymentStatus: PaymentStatus
  deliveryStatus: DeliveryStatus
}) {
  return (
    input.approvalStatus === 'Approved' &&
    input.paymentStatus === 'Paid' &&
    (input.deliveryStatus === 'Scheduled' || input.deliveryStatus === 'Live')
  )
}

export function permittedCampaignActions(status: CampaignStatus) {
  const approval = deriveApprovalStatus(status)
  const delivery = deriveDeliveryStatus(status)

  return {
    view: true,
    edit: status === 'Draft' || status === 'Revision Required' || status === 'Paused',
    duplicate: true,
    pause: delivery === 'Live',
    resume: delivery === 'Paused',
    cancel:
      status !== 'Completed' &&
      status !== 'Cancelled' &&
      status !== 'Live' &&
      approval !== 'Rejected',
    submit: status === 'Draft' || status === 'Revision Required',
  }
}

/** Advertiser-facing filters. Admin queue statuses kept for legacy rows only. */
export const LIFECYCLE_STATUSES: CampaignStatus[] = [
  'Draft',
  'Scheduled',
  'Live',
  'Paused',
  'Completed',
  'Cancelled',
  'Submitted',
  'Under Review',
  'Revision Required',
  'Approved',
  'Rejected',
]
