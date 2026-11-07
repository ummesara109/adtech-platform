import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75 }

export function IconOverview(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function IconBuilding(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 21V5a1 1 0 0 1 1-1h5v17" />
      <path d="M10 21V9h4v12" />
      <path d="M14 21V3h5a1 1 0 0 1 1 1v17" />
      <path d="M7 8h1M7 12h1M7 16h1M17 8h1M17 12h1M17 16h1" />
    </svg>
  )
}

export function IconShield(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 4 7v6c0 5 3.5 8 8 8s8-3 8-8V7l-8-4z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function IconMegaphone(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 10v4h4l5 4V6L8 10H4z" />
      <path d="M16 8a4 4 0 0 1 0 8" />
    </svg>
  )
}

export function IconActivity(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 14h4l2-8 4 16 2-6h4" />
    </svg>
  )
}

export function IconChart(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20V10M10 20V4M16 20v-6M22 20H2" />
    </svg>
  )
}

export function IconReceipt(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  )
}

export function IconMap(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4 3 6.5V20l6-2 6 2 6-2.5V4L15 6.5 9 4z" />
      <path d="M9 4v14M15 6.5V20" />
    </svg>
  )
}

export function IconImage(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="m21 16-5.5-5.5L9 17" />
    </svg>
  )
}

export function IconBell(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M18 16V11a6 6 0 1 0-12 0v5l-2 2h16l-2-2z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function IconCog(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}

export function IconHelp(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1.4 1-1.4 1.9V14" />
      <path d="M12 17h.01" />
    </svg>
  )
}

export function IconTeam(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a3 3 0 0 1 0 5.74" />
    </svg>
  )
}

export const navIconMap = {
  overview: IconOverview,
  profile: IconBuilding,
  verification: IconShield,
  campaigns: IconMegaphone,
  performance: IconActivity,
  reports: IconChart,
  billing: IconReceipt,
  inventory: IconMap,
  creatives: IconImage,
  analytics: IconChart,
  notifications: IconBell,
  team: IconTeam,
  settings: IconCog,
  support: IconHelp,
} as const
