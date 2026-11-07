import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75 }

export function IconCampaigns(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 10v4h4l5 4V6L8 10H4z" />
      <path d="M16 8a4 4 0 0 1 0 8" />
    </svg>
  )
}

export function IconPulse(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 14h4l2-8 4 16 2-6h4" />
    </svg>
  )
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8 6 4-6 4V8z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconSpend(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  )
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
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

export function IconUpload(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 16V7M8 10l4-4 4 4" />
      <path d="M5 19h14" />
    </svg>
  )
}

export function IconScreen(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  )
}

export function IconDownload(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v10M8 11l4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  )
}

export function IconSupport(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1.4 1-1.4 1.9V14" />
      <path d="M12 17h.01" />
    </svg>
  )
}

export function IconChevron(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m7 10 5 5 5-5" />
    </svg>
  )
}

export function IconCalendar(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  )
}

export function IconMapPin(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

export function IconWallet(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 8h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
      <path d="M3 8V6a2 2 0 0 1 2-2h12" />
      <circle cx="17" cy="14" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}
