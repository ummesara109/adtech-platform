/** Lightweight SVG illustrations matching the presentation palette (navy / yellow / blue). */

export function AutoRickshawHero({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden>
      <ellipse cx="80" cy="108" rx="48" ry="6" fill="#0b2a6b" opacity="0.15" />
      <rect x="38" y="48" width="78" height="42" rx="10" fill="#f5c518" stroke="#0b2a6b" strokeWidth="3" />
      <path d="M48 48c8-18 48-18 58 0" fill="#93c5fd" stroke="#0b2a6b" strokeWidth="3" />
      <circle cx="55" cy="92" r="12" fill="#0f172a" />
      <circle cx="55" cy="92" r="5" fill="#94a3b8" />
      <circle cx="105" cy="92" r="12" fill="#0f172a" />
      <circle cx="105" cy="92" r="5" fill="#94a3b8" />
      <rect x="28" y="58" width="14" height="8" rx="2" fill="#0b2a6b" />
    </svg>
  )
}

export function AutoRickshawSmall({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      <rect x="24" y="28" width="64" height="32" rx="8" fill="#f5c518" stroke="#0b2a6b" strokeWidth="2.5" />
      <path d="M32 28c6-12 36-12 44 0" fill="#93c5fd" stroke="#0b2a6b" strokeWidth="2.5" />
      <circle cx="40" cy="62" r="9" fill="#0f172a" />
      <circle cx="78" cy="62" r="9" fill="#0f172a" />
    </svg>
  )
}

export function DeviceBox({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden>
      <rect x="30" y="28" width="60" height="42" rx="6" fill="#1e293b" />
      <rect x="38" y="36" width="44" height="6" rx="2" fill="#64748b" />
      <circle cx="60" cy="56" r="6" fill="#38bdf8" />
      <path d="M48 18c8-8 16-8 24 0" stroke="#3b82f6" strokeWidth="3" fill="none" />
      <path d="M52 24c5-5 11-5 16 0" stroke="#3b82f6" strokeWidth="3" fill="none" />
    </svg>
  )
}

export function SupportAgent({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <circle cx="60" cy="36" r="16" fill="#93c5fd" stroke="#0b2a6b" strokeWidth="2" />
      <path d="M36 78c4-18 44-18 48 0" fill="#0b2a6b" />
      <path d="M34 40c0-16 52-16 52 0" stroke="#0b2a6b" strokeWidth="4" fill="none" />
      <circle cx="34" cy="48" r="5" fill="#0b2a6b" />
      <circle cx="86" cy="48" r="5" fill="#0b2a6b" />
    </svg>
  )
}

export function CitySkyline({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 90" className={className} aria-hidden>
      <rect x="10" y="40" width="28" height="50" fill="#93c5fd" />
      <rect x="46" y="20" width="36" height="70" fill="#60a5fa" />
      <rect x="90" y="34" width="24" height="56" fill="#93c5fd" />
      <rect x="122" y="12" width="40" height="78" fill="#3b82f6" />
      <rect x="170" y="28" width="30" height="62" fill="#93c5fd" />
      <rect x="208" y="18" width="44" height="72" fill="#60a5fa" />
      <path d="M0 88h280" stroke="#0b2a6b" strokeWidth="2" opacity="0.3" />
    </svg>
  )
}
