import {
  IconCampaigns,
  IconCheck,
  IconPlay,
  IconScreen,
  IconSpend,
} from './DashboardIcons'
import type { DemoKpi } from '../../lib/demoDashboardPreview'

function KpiIcon({ kind }: { kind: DemoKpi['icon'] }) {
  const className = 'h-5 w-5'
  switch (kind) {
    case 'devices':
      return <IconScreen className={className} />
    case 'campaigns':
      return <IconCampaigns className={className} />
    case 'starts':
      return <IconPlay className={className} />
    case 'completed':
      return <IconCheck className={className} />
    case 'rate':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    case 'spend':
      return <IconSpend className={className} />
    default:
      return null
  }
}

function CompletionRing({ value }: { value: string }) {
  const numeric = parseFloat(value)
  const pct = Number.isFinite(numeric) ? numeric : 0
  const size = 44
  const stroke = 4
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c

  return (
    <svg width={size} height={size} className="shrink-0" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#0d9488"
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

type Props = {
  items: DemoKpi[]
}

export function DashboardKpiCards({ items }: Props) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((kpi) => (
        <article
          key={kpi.id}
          className="flex items-center gap-4 rounded-2xl border border-navy/[0.06] bg-card p-4 shadow-[var(--shadow-card)]"
        >
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${kpi.accent}`}>
            <KpiIcon kind={kpi.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted">{kpi.label}</p>
            <div className="mt-0.5 flex items-center gap-2">
              {kpi.icon === 'rate' ? (
                <>
                  <p className="text-2xl font-bold tabular-nums text-navy">{kpi.value}</p>
                  <CompletionRing value={kpi.value} />
                </>
              ) : (
                <p className="text-2xl font-bold tabular-nums text-navy">{kpi.value}</p>
              )}
            </div>
            <p className={`mt-1 text-xs font-semibold ${kpi.trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              {kpi.trend} <span className="font-normal text-muted">vs prior period (demo)</span>
            </p>
          </div>
        </article>
      ))}
    </section>
  )
}
