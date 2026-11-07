import { Link } from 'react-router-dom'
import type { ScheduleItem } from '../../lib/dashboardMetrics'
import { campaignStatusClass } from '../../lib/statusStyles'
import { EmptyState } from '../ui/EmptyState'
import { ButtonLink } from '../ui/Button'

type Props = {
  items: ScheduleItem[]
  canDraft: boolean
}

export function CampaignSchedule({ items, canDraft }: Props) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No upcoming schedule"
        description="Approved, scheduled, and live campaigns appear here with start/end dates. Operating hours are set during campaign creation."
        action={
          canDraft ? (
            <ButtonLink to="/campaigns/create" size="sm">
              Create campaign
            </ButtonLink>
          ) : undefined
        }
      />
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            to={`/campaigns/${item.id}`}
            className="block rounded-xl bg-paper/80 px-3 py-3 ring-1 ring-navy/[0.05] transition hover:bg-paper hover:ring-navy/10"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-navy">{item.name}</p>
              <span className={campaignStatusClass(item.status)}>{item.status}</span>
            </div>
            <p className="mt-1 font-mono text-xs text-muted">{item.id}</p>
            <p className="mt-2 text-sm text-navy">
              {item.startDate || '—'} → {item.endDate || '—'}
            </p>
            <p className="mt-1 text-xs text-muted">
              {item.locations.length ? item.locations.join(', ') : 'Locations TBD'} · {item.note}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
