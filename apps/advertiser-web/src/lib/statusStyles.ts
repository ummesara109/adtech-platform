import type { CampaignStatus, PaymentStatus, VerificationStatus } from '../types/advertiser'

const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset'

export function campaignStatusClass(status: CampaignStatus) {
  switch (status) {
    case 'Live':
      return `${base} bg-teal-50 text-teal-800 ring-teal-200`
    case 'Scheduled':
    case 'Approved':
      return `${base} bg-sky-100 text-sky-900`
    case 'Under Review':
    case 'Submitted':
      return `${base} bg-amber-100 text-amber-950`
    case 'Revision Required':
      return `${base} bg-orange-100 text-orange-950`
    case 'Paused':
      return `${base} bg-slate-200 text-slate-800`
    case 'Completed':
      return `${base} bg-emerald-100 text-emerald-900`
    case 'Rejected':
    case 'Cancelled':
      return `${base} bg-rose-100 text-rose-900`
    default:
      return `${base} bg-stone-200 text-stone-800`
  }
}

export function paymentStatusClass(status: PaymentStatus) {
  switch (status) {
    case 'Paid':
      return `${base} bg-emerald-100 text-emerald-900`
    case 'Authorized':
      return `${base} bg-sky-100 text-sky-900`
    case 'Failed':
      return `${base} bg-rose-100 text-rose-900`
    case 'Refunded':
    case 'Partially Refunded':
      return `${base} bg-violet-100 text-violet-900`
    default:
      return `${base} bg-stone-200 text-stone-800`
  }
}

export function verificationClass(status: VerificationStatus) {
  switch (status) {
    case 'Verified':
      return `${base} bg-emerald-100 text-emerald-900`
    case 'Rejected':
      return `${base} bg-rose-100 text-rose-900`
    case 'Under Review':
      return `${base} bg-sky-100 text-sky-900`
    case 'Pending':
    default:
      return `${base} bg-amber-100 text-amber-950`
  }
}
