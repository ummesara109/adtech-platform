import type { AdvertiserCreative, AdvertiserNotification } from '../api/advertiserWorkspace'

/** No seeded creatives — uploads stay local until the creatives API exists. */
export const creatives: AdvertiserCreative[] = []

/** No seeded notifications — inbox fills from advertiser-scoped API events. */
export const notifications: AdvertiserNotification[] = []

export const supportTickets: {
  id: string
  subject: string
  category: string
  status: string
  updated: string
}[] = []

export const teamMembers: {
  id: string
  name: string
  email: string
  role: string
  permissions: string[]
}[] = []

/** Kept for reference; Team page uses `lib/teamRoles` as the source of truth. */
export const roleCatalog = [
  {
    role: 'Admin',
    description: 'Full advertiser workspace control including team and billing settings.',
  },
  {
    role: 'Campaign Manager',
    description: 'Create and edit campaigns, creatives, and targeting. No billing or team changes.',
  },
  {
    role: 'Analyst',
    description: 'Read analytics and Proof of Play reports only.',
  },
  {
    role: 'Billing Manager',
    description: 'Manage invoices and payment views. Limited campaign editing.',
  },
  {
    role: 'Viewer',
    description: 'Read-only access across campaigns, creatives, and analytics.',
  },
]
