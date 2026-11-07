import { formatNumber } from '../../lib/format'
import { EmptyState } from '../ui/EmptyState'
import { ButtonLink } from '../ui/Button'
import { IconMapPin } from './DashboardIcons'

type Props = {
  allocatedAutos: number
  requestedAutos: number
  availableScreens: number | null
  selectedLocations: string[]
  note: string | null
}

/**
 * Honest inventory panel — never draws a map with fabricated auto-rickshaw coordinates.
 * A live Bengaluru map belongs here only when GPS / inventory records are available.
 */
export function LocationInventoryPanel({
  allocatedAutos,
  requestedAutos,
  availableScreens,
  selectedLocations,
  note,
}: Props) {
  const hasLocations = selectedLocations.length > 0

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-navy/15 bg-gradient-to-br from-paper via-white to-teal/[0.06] px-4 py-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy/[0.06] text-navy">
          <IconMapPin className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-navy">Bengaluru screen map</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          Interactive auto-rickshaw locations appear when live inventory coordinates are connected. We do not plot
          placeholder pins.
        </p>
        <div className="mt-4">
          <ButtonLink to="/campaigns/create" variant="secondary" size="sm">
            Request autos in campaign
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-paper px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Allocated screens</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-navy">{formatNumber(allocatedAutos)}</p>
        </div>
        <div className="rounded-xl bg-paper px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Booked / requested</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-navy">{formatNumber(requestedAutos)}</p>
        </div>
        <div className="rounded-xl bg-paper px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Available screens</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-navy">
            {availableScreens == null ? '—' : formatNumber(availableScreens)}
          </p>
        </div>
        <div className="rounded-xl bg-paper px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Selected locations</p>
          <p className="mt-1 text-sm font-semibold text-navy">
            {hasLocations ? selectedLocations.join(', ') : 'None yet'}
          </p>
        </div>
      </div>

      {!hasLocations ? (
        <EmptyState
          title="No campaign locations yet"
          description="Choose Bengaluru areas when you create a campaign. Allocated autos appear after admin approval."
        />
      ) : null}

      {note ? <p className="text-xs text-muted">{note}</p> : null}
    </div>
  )
}
