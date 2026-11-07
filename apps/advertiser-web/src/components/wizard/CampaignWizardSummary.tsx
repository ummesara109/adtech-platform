import { formatInr, formatNumber } from '../../lib/format'
import type { CampaignDraft, WizardStepId } from '../../types/campaignWizard'
import { campaignDayCount } from '../../lib/campaignQuote'

type Props = {
  draft: CampaignDraft
  compact?: boolean
  onEditStep?: (step: WizardStepId) => void
}

export function CampaignWizardSummary({ draft, compact = false, onEditStep }: Props) {
  const days = campaignDayCount(draft)
  const scheduleLabel =
    draft.startDate && draft.endDate
      ? `${draft.startDate} → ${draft.endDate}${days ? ` · ${days}d` : ''}`
      : '—'

  /** Highlights only — details are on the main stage panels / review. */
  const rows: Array<{ label: string; value: string; editStep?: WizardStepId }> = [
    {
      label: 'Locations',
      value: draft.locations.length ? draft.locations.join(', ') : '—',
      editStep: 2,
    },
    {
      label: 'Requested autos',
      value: (() => {
        const parts = draft.locations
          .map((area) => {
            const n = draft.locationRequests[area]
            return typeof n === 'number' && n > 0 ? `${area}: ${formatNumber(n)}` : null
          })
          .filter(Boolean)
        if (parts.length) return `${formatNumber(draft.requestedAutos)} (${parts.join('; ')})`
        return formatNumber(draft.requestedAutos)
      })(),
      editStep: 2,
    },
    { label: 'Campaign dates', value: scheduleLabel, editStep: 2 },
    {
      label: 'Budget',
      value: draft.campaignBudgetInr > 0 ? formatInr(draft.campaignBudgetInr) : '—',
      editStep: 2,
    },
  ]

  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
        {rows.map((row) => (
          <div key={row.label} className="shrink-0 rounded-lg bg-paper px-2.5 py-1.5 ring-1 ring-navy/[0.06]">
            <p className="font-semibold uppercase tracking-wide text-muted">{row.label}</p>
            <p className="mt-0.5 max-w-[10rem] truncate font-semibold text-navy">{row.value}</p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <aside className="rounded-2xl border border-navy/[0.08] bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="text-[11px] font-bold uppercase tracking-widest text-auto-dark">At a glance</p>
      <h3 className="mt-1 truncate text-base font-bold text-navy">{draft.name || 'Untitled campaign'}</h3>
      <p className="mt-0.5 text-xs text-muted">{draft.city}</p>
      <dl className="mt-3 space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-2 text-sm">
            <div className="min-w-0">
              <dt className="text-xs text-muted">{row.label}</dt>
              <dd className="mt-0.5 break-words font-semibold text-navy" title={row.value}>
                {row.value}
              </dd>
            </div>
            {row.editStep && onEditStep ? (
              <button
                type="button"
                className="shrink-0 text-[11px] font-semibold text-teal hover:underline"
                onClick={() => onEditStep(row.editStep!)}
              >
                Edit
              </button>
            ) : null}
          </div>
        ))}
      </dl>
      <p className="mt-3 rounded-lg bg-paper px-2.5 py-2 text-[10px] leading-relaxed text-muted">
        Taxes and final totals follow platform invoicing. Estimated reach on the audience stage is modelled — not verified
        impressions.
      </p>
    </aside>
  )
}
