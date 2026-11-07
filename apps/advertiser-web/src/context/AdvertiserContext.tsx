import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { clearAuthSession } from '../lib/authSession'
import {
  clearIdentity,
  defaultIdentity,
  identityFromProfile,
  loadIdentity,
  saveIdentity,
  type AdvertiserIdentity,
} from '../lib/advertiserProfile'
import type { CompanyProfile, VerificationStatus } from '../types/advertiser'

type ApiUserProfile = {
  email: string
  fullName: string
  companyName: string
  verificationStatus: string
}

type AdvertiserContextValue = AdvertiserIdentity & {
  updateProfile: (profile: CompanyProfile) => void
  applyApiUser: (user: ApiUserProfile) => void
  resetWorkspace: () => void
}

const AdvertiserContext = createContext<AdvertiserContextValue | null>(null)

function asVerificationStatus(value: string): VerificationStatus {
  if (value === 'Verified' || value === 'Rejected' || value === 'Under Review' || value === 'Pending') return value
  if (value === 'UnderReview') return 'Under Review'
  return 'Pending'
}

export function AdvertiserProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<AdvertiserIdentity>(() => loadIdentity())

  const value = useMemo<AdvertiserContextValue>(
    () => ({
      ...identity,
      updateProfile: (profile) => {
        const next = identityFromProfile(profile, identity)
        saveIdentity(next)
        setIdentity(next)
      },
      applyApiUser: (user) => {
        const next: AdvertiserIdentity = {
          ...identity,
          account: {
            fullName: user.fullName,
            companyName: user.companyName,
            city: identity.account.city || 'Bengaluru',
            verificationStatus: asVerificationStatus(user.verificationStatus),
          },
          profile: {
            ...identity.profile,
            contactName: user.fullName,
            contactEmail: user.email,
            tradeName: user.companyName,
            legalName: identity.profile.legalName || user.companyName,
          },
          verification: {
            ...identity.verification,
            status: asVerificationStatus(user.verificationStatus),
          },
        }
        saveIdentity(next)
        setIdentity(next)
      },
      resetWorkspace: () => {
        clearAuthSession()
        clearIdentity()
        setIdentity(defaultIdentity())
      },
    }),
    [identity],
  )

  return <AdvertiserContext.Provider value={value}>{children}</AdvertiserContext.Provider>
}

export function useAdvertiser() {
  const ctx = useContext(AdvertiserContext)
  if (!ctx) throw new Error('AdvertiserProvider is required')
  return ctx
}
