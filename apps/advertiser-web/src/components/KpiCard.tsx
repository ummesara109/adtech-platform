import { Link } from 'react-router-dom'

type KpiCardProps = {
  label: string
  value: string
  hint?: string
  accent?: 'teal' | 'auto' | 'navy'
  to?: string
  actionLabel?: string
}

const accentBar = {
  teal: 'from-teal to-teal/40',
  auto: 'from-auto to-auto/50',
  navy: 'from-navy to-navy/30',
}

export function KpiCard({ label, value, hint, accent = 'teal', to, actionLabel = 'View' }: KpiCardProps) {
  const body = (
    <>
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accentBar[accent]} opacity-80`} />
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-navy">{value}</p>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p> : null}
      {to ? (
        <p className="mt-3 text-xs font-semibold text-teal group-hover:underline">
          {actionLabel} →
        </p>
      ) : null}
    </>
  )

  const className =
    'group relative block overflow-hidden rounded-2xl border border-navy/[0.06] bg-card p-4 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-teal/25 hover:shadow-md'

  if (to) {
    return (
      <Link to={to} className={className}>
        {body}
      </Link>
    )
  }

  return <article className={className}>{body}</article>
}
