/** Advertiser workspace RBAC catalog — display only until NestJS enforces roles. */

export const teamRoles = [
  'Admin',
  'Campaign Manager',
  'Analyst',
  'Billing Manager',
  'Viewer',
] as const

export type TeamRole = (typeof teamRoles)[number]

export const teamMemberStatuses = ['Active', 'Pending', 'Deactivated'] as const
export type TeamMemberStatus = (typeof teamMemberStatuses)[number]

export type PermissionSection =
  | 'Dashboard'
  | 'Campaigns'
  | 'Creatives'
  | 'Analytics'
  | 'Billing'
  | 'Team'
  | 'Settings'

export const permissionSections: PermissionSection[] = [
  'Dashboard',
  'Campaigns',
  'Creatives',
  'Analytics',
  'Billing',
  'Team',
  'Settings',
]

export type AccessLevel = 'Full' | 'Edit' | 'View' | 'None'

export const roleDescriptions: Record<TeamRole, string> = {
  Admin: 'Full advertiser workspace control, including team invites and billing settings.',
  'Campaign Manager': 'Create and manage campaigns and creatives. No billing or team changes.',
  Analyst: 'View analytics and Proof of Play reports. Read-only elsewhere.',
  'Billing Manager': 'Manage invoices and payment views. Limited campaign editing.',
  Viewer: 'Read-only access across campaigns, creatives, and analytics.',
}

const matrix: Record<TeamRole, Record<PermissionSection, AccessLevel>> = {
  Admin: {
    Dashboard: 'Full',
    Campaigns: 'Full',
    Creatives: 'Full',
    Analytics: 'Full',
    Billing: 'Full',
    Team: 'Full',
    Settings: 'Full',
  },
  'Campaign Manager': {
    Dashboard: 'View',
    Campaigns: 'Edit',
    Creatives: 'Edit',
    Analytics: 'View',
    Billing: 'None',
    Team: 'None',
    Settings: 'View',
  },
  Analyst: {
    Dashboard: 'View',
    Campaigns: 'View',
    Creatives: 'View',
    Analytics: 'Full',
    Billing: 'None',
    Team: 'None',
    Settings: 'None',
  },
  'Billing Manager': {
    Dashboard: 'View',
    Campaigns: 'View',
    Creatives: 'None',
    Analytics: 'View',
    Billing: 'Full',
    Team: 'None',
    Settings: 'View',
  },
  Viewer: {
    Dashboard: 'View',
    Campaigns: 'View',
    Creatives: 'View',
    Analytics: 'View',
    Billing: 'View',
    Team: 'None',
    Settings: 'None',
  },
}

export function roleAccess(role: TeamRole, section: PermissionSection): AccessLevel {
  return matrix[role][section]
}

export function accessLabel(level: AccessLevel): string {
  switch (level) {
    case 'Full':
      return 'Full'
    case 'Edit':
      return 'Edit'
    case 'View':
      return 'View'
    default:
      return '—'
  }
}

export function memberStatusClass(status: TeamMemberStatus): string {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset'
  switch (status) {
    case 'Active':
      return `${base} bg-emerald-100 text-emerald-900 ring-emerald-200`
    case 'Pending':
      return `${base} bg-amber-100 text-amber-950 ring-amber-200`
    case 'Deactivated':
      return `${base} bg-stone-200 text-stone-800 ring-stone-300`
  }
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
}
