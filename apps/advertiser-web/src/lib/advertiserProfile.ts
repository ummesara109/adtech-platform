import type { AdvertiserAccount, CompanyProfile, VerificationRecord } from '../types/advertiser'

const KEY = 'adtech.advertiser.profile'

export type AdvertiserIdentity = {
  account: AdvertiserAccount
  profile: CompanyProfile
  verification: VerificationRecord
}

export const defaultIdentity = (): AdvertiserIdentity => ({
  account: {
    fullName: 'Advertiser',
    companyName: 'Your company',
    city: 'Bengaluru',
    verificationStatus: 'Pending',
  },
  profile: {
    registeredOn: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    legalName: '',
    tradeName: '',
    businessType: '',
    gstin: '',
    registeredAddress: '',
    city: 'Bengaluru',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    industry: '',
  },
  verification: {
    status: 'Pending',
    submittedOn: '',
    reviewedOn: null,
    documents: [
      { label: 'Company registration (Certificate of Incorporation)', status: 'Required' },
      { label: 'GST registration certificate', status: 'Required' },
      { label: 'Authorized signatory ID', status: 'Required' },
      { label: 'Business address proof', status: 'Required' },
    ],
    notes:
      'Complete company name, contact details, and business documents. KYC moves Pending → Under Review → Verified (or Rejected). You can browse the dashboard and prepare drafts while pending; submission for approval requires Verified status.',
  },
})

export function loadIdentity(): AdvertiserIdentity {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultIdentity()
    const parsed = JSON.parse(raw) as AdvertiserIdentity
    const fallback = defaultIdentity()
    return {
      account: { ...fallback.account, ...parsed.account },
      profile: { ...fallback.profile, ...parsed.profile },
      verification: {
        ...fallback.verification,
        ...parsed.verification,
        documents: parsed.verification?.documents?.length
          ? parsed.verification.documents
          : fallback.verification.documents,
      },
    }
  } catch {
    return defaultIdentity()
  }
}

export function saveIdentity(identity: AdvertiserIdentity) {
  localStorage.setItem(KEY, JSON.stringify(identity))
}

export function clearIdentity() {
  localStorage.removeItem(KEY)
}

export function identityFromProfile(profile: CompanyProfile, current: AdvertiserIdentity): AdvertiserIdentity {
  const companyName = profile.tradeName.trim() || profile.legalName.trim() || 'Your company'
  const fullName = profile.contactName.trim() || 'Advertiser'
  const city = profile.city.split(',')[0]?.trim() || 'Bengaluru'
  const hasDocs = Boolean(profile.legalName.trim() && profile.gstin.trim() && profile.contactName.trim())
  return {
    profile,
    account: {
      fullName,
      companyName,
      city,
      verificationStatus: hasDocs ? 'Pending' : current.account.verificationStatus,
    },
    verification: {
      ...current.verification,
      status: hasDocs ? 'Pending' : current.verification.status,
      submittedOn:
        hasDocs && !current.verification.submittedOn
          ? new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : current.verification.submittedOn,
      notes: current.verification.notes,
    },
  }
}
