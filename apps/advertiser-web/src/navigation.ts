import type { navIconMap } from './components/icons/NavIcons'

/** Phase 3 advertiser sidebar — no admin controls. */
export const advertiserNav: {
  to: string
  label: string
  icon: keyof typeof navIconMap
}[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'overview' },
  { to: '/campaigns', label: 'Campaigns', icon: 'campaigns' },
  { to: '/creatives', label: 'Creative Library', icon: 'creatives' },
  { to: '/analytics', label: 'Analytics', icon: 'analytics' },
  { to: '/billing', label: 'Billing', icon: 'billing' },
  { to: '/team', label: 'Team', icon: 'team' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]
