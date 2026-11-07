import { useState } from 'react'
import { inventoryAreas } from '../../data/campaignWizard'
import { useInventoryAvailability } from '../../hooks/useInventoryAvailability'
import { formatNumber } from '../../lib/format'
import { PREVIEW_LOCALITIES } from '../../lib/previewInventory'
import type { CampaignDraft, WeekDay } from '../../types/campaignWizard'
import { weekDays } from '../../types/campaignWizard'
import { chipClass, inputClass, inputErrorClass, labelClass } from './fieldStyles'
import { Callout } from '../ui/Callout'

type Props = {
  draft: CampaignDraft
  onPatch: (partial: Partial<CampaignDraft>) => void
}

function todayYmd() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function statusLabel(status: string) {
  switch (status) {
    case 'available':
      return { text: 'Available', className: 'bg-teal-muted text-teal' }
    case 'preview':
      return { text: 'Preview available', className: 'bg-sky-100 text-sky-950' }
    case 'limited':
      return { text: 'Over limit', className: 'bg-amber-100 text-amber-950' }
    case 'unavailable':
      return { text: 'Unavailable', className: 'bg-rose-100 text-rose-800' }
    case 'disconnected':
      return { text: 'Not connected', className: 'bg-navy/[0.06] text-muted' }
    default:
      return { text: 'Unknown', className: 'bg-paper text-muted' }
  }
}

function syncRequestedTotal(locationRequests: Record<string, number>, locations: string[]) {
  return Math.max(
    1,
    locations.reduce((sum, area) => sum + (locationRequests[area] ?? 0), 0),
  )
}

export function LocationAvailabilityPanel({ draft, onPatch }: Props) {
  const availability = useInventoryAvailability({
    city: draft.city,
    localities: draft.locations,
    startDate: draft.startDate,
    endDate: draft.endDate,
    startTime: draft.operatingStart,
    endTime: draft.operatingEnd,
    daysOfWeek: draft.daysOfWeek,
    locationRequests: draft.locationRequests,
  })
  const [limitErrors, setLimitErrors] = useState<Record<string, string>>({})

  const hoursInvalid = draft.operatingEnd <= draft.operatingStart

  function toggleLocation(area: string) {
    const selected = draft.locations.includes(area)
    const locations = selected ? draft.locations.filter((value) => value !== area) : [...draft.locations, area]
    const locationRequests = { ...draft.locationRequests }
    if (selected) delete locationRequests[area]
    else if (!locationRequests[area]) locationRequests[area] = 1
    setLimitErrors((current) => {
      const next = { ...current }
      delete next[area]
      return next
    })
    onPatch({
      locations,
      locationRequests,
      requestedAutos: syncRequestedTotal(locationRequests, locations),
      selectedScreenIds: [],
    })
  }

  function toggleDay(day: WeekDay) {
    const daysOfWeek = draft.daysOfWeek.includes(day)
      ? draft.daysOfWeek.filter((value) => value !== day)
      : [...draft.daysOfWeek, day]
    onPatch({ daysOfWeek, selectedScreenIds: [] })
  }

  function setAreaRequest(area: string, value: number) {
    const available = availability.areas.find((row) => row.locality === area)?.available
    const typed = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
    let next = typed

    if (typeof available === 'number' && available >= 0 && typed > available) {
      next = available
      setLimitErrors((current) => ({
        ...current,
        [area]: `Only ${formatNumber(available)} autos are available in ${area}. You entered ${formatNumber(typed)} — value was capped to ${formatNumber(available)}.`,
      }))
    } else {
      setLimitErrors((current) => {
        if (!current[area]) return current
        const nextErrors = { ...current }
        delete nextErrors[area]
        return nextErrors
      })
    }

    const locationRequests = { ...draft.locationRequests, [area]: next }
    onPatch({
      locationRequests,
      requestedAutos: syncRequestedTotal(locationRequests, draft.locations),
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <p className={labelClass}>Bengaluru areas</p>
        <p className="mt-1 text-sm text-muted">Select one or more localities for this campaign.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {inventoryAreas.map((area) => {
            const selected = draft.locations.includes(area.area)
            const live = availability.areas.find((row) => row.locality === area.area)
            const catalog = PREVIEW_LOCALITIES.find((row) => row.name === area.area)
            const shownAvailable = live?.available ?? catalog?.registered ?? null
            return (
              <button
                key={area.area}
                type="button"
                onClick={() => toggleLocation(area.area)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selected
                    ? 'border-navy bg-navy text-white shadow-sm'
                    : 'border-navy/10 bg-white text-navy hover:border-navy/20'
                }`}
              >
                <p className="font-semibold">{area.area}</p>
                <p className={`mt-1 text-xs ${selected ? 'text-white/70' : 'text-muted'}`}>
                  {shownAvailable != null
                    ? `${formatNumber(shownAvailable)} autos available${live?.available == null ? ' (catalog)' : ''}`
                    : 'Availability pending inventory'}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {draft.locations.length ? (
        <div>
          <p className={labelClass}>Selected areas</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {draft.locations.map((area) => (
              <button
                key={area}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full bg-auto/20 px-3 py-1.5 text-xs font-semibold text-navy ring-1 ring-auto/40"
                onClick={() => toggleLocation(area)}
              >
                {area}
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="avail-start">
            Campaign start date
          </label>
          <input
            id="avail-start"
            type="date"
            min={todayYmd()}
            className={inputClass}
            value={draft.startDate}
            onChange={(event) => onPatch({ startDate: event.target.value, selectedScreenIds: [] })}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="avail-end">
            Campaign end date
          </label>
          <input
            id="avail-end"
            type="date"
            min={draft.startDate || todayYmd()}
            className={inputClass}
            value={draft.endDate}
            onChange={(event) => onPatch({ endDate: event.target.value, selectedScreenIds: [] })}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="avail-t0">
            Operating start time
          </label>
          <input
            id="avail-t0"
            type="time"
            className={inputClass}
            value={draft.operatingStart}
            onChange={(event) => onPatch({ operatingStart: event.target.value, selectedScreenIds: [] })}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="avail-t1">
            Operating end time
          </label>
          <input
            id="avail-t1"
            type="time"
            className={hoursInvalid ? inputErrorClass : inputClass}
            value={draft.operatingEnd}
            onChange={(event) => onPatch({ operatingEnd: event.target.value, selectedScreenIds: [] })}
          />
          {hoursInvalid ? (
            <p className="mt-1.5 text-xs font-medium text-rose-700">End time must be later than start time.</p>
          ) : null}
        </div>
      </div>

      <div>
        <p className={labelClass}>Operating days</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {weekDays.map((day) => (
            <button
              key={day}
              type="button"
              className={chipClass(draft.daysOfWeek.includes(day))}
              onClick={() => toggleDay(day)}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-navy/[0.08] bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <p className="text-sm font-bold text-navy">Advertisement settings</p>
        <p className="mt-0.5 text-xs text-muted">How long each play runs and how often it can appear per device per day.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between gap-2">
              <label className={labelClass} htmlFor="wizard-ad-duration">
                Spot duration (seconds)
              </label>
              <span className="text-sm font-semibold text-teal">{draft.adDurationSeconds}s</span>
            </div>
            <input
              id="wizard-ad-duration"
              type="range"
              min={10}
              max={30}
              className="mt-2 w-full accent-auto"
              value={draft.adDurationSeconds}
              onChange={(event) => onPatch({ adDurationSeconds: Number(event.target.value) })}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="wizard-frequency">
              Frequency cap (plays / device / day)
            </label>
            <input
              id="wizard-frequency"
              type="number"
              min={1}
              className={inputClass}
              value={draft.frequencyCap}
              onChange={(event) => onPatch({ frequencyCap: Number(event.target.value) })}
            />
          </div>
        </div>
      </div>

      {availability.isPreview || availability.disconnected ? (
        <Callout variant="measurement">{availability.note}</Callout>
      ) : null}
      {availability.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
          {availability.error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Total registered', value: availability.totals.totalRegistered },
          { label: 'Available', value: availability.totals.available },
          { label: 'Unavailable / booked', value: availability.totals.booked == null && availability.totals.unavailable == null
              ? null
              : (availability.totals.booked ?? 0) + (availability.totals.unavailable ?? 0) },
          { label: 'Requested', value: availability.totals.requested },
          { label: 'Allocated', value: availability.totals.allocated },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl bg-paper px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-navy">
              {availability.loading ? '…' : card.value == null ? '—' : formatNumber(card.value)}
            </p>
          </div>
        ))}
      </div>

      {!draft.locations.length ? (
        <p className="rounded-xl border border-dashed border-navy/15 bg-paper/60 px-4 py-6 text-center text-sm text-muted">
          Select at least one Bengaluru area to check availability.
        </p>
      ) : !availability.scheduleReady ? (
        <p className="rounded-xl border border-dashed border-navy/15 bg-paper/60 px-4 py-6 text-center text-sm text-muted">
          Set start/end dates, operating hours, and at least one weekday to refresh availability.
        </p>
      ) : availability.loading ? (
        <p className="rounded-xl bg-paper px-4 py-6 text-center text-sm text-muted">Checking live inventory…</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy/[0.08]">
          <div className="border-b border-navy/[0.06] bg-paper/80 px-4 py-3">
            <p className="text-sm font-bold text-navy">Area-wise availability</p>
            <p className="text-xs text-muted">
              {draft.startDate} → {draft.endDate} · {draft.operatingStart}–{draft.operatingEnd} ·{' '}
              {draft.daysOfWeek.length} weekday{draft.daysOfWeek.length === 1 ? '' : 's'}
            </p>
          </div>
          <ul className="divide-y divide-navy/[0.06]">
            {availability.areas.map((row) => {
              const badge = statusLabel(row.status)
              return (
                <li key={row.locality} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-navy">{row.locality}</p>
                      <p className="mt-1 text-xs text-muted">
                        Registered {row.totalRegistered == null ? '—' : formatNumber(row.totalRegistered)}
                        {' · '}Eligible {row.eligible == null ? '—' : formatNumber(row.eligible)}
                        {' · '}Available {row.available == null ? '—' : formatNumber(row.available)}
                        {' · '}Booked {row.booked == null ? '—' : formatNumber(row.booked)}
                        {' · '}Unavailable {row.unavailable == null ? '—' : formatNumber(row.unavailable)}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>
                      {badge.text}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:max-w-md">
                    <div className="rounded-xl bg-paper px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Available autos
                      </p>
                      <p className="mt-0.5 text-lg font-bold tabular-nums text-navy">
                        {row.available == null ? '—' : formatNumber(row.available)}
                      </p>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor={`req-${row.locality}`}>
                        Requested autos
                      </label>
                      <input
                        id={`req-${row.locality}`}
                        type="number"
                        min={0}
                        max={row.available ?? undefined}
                        className={limitErrors[row.locality] ? inputErrorClass : inputClass}
                        value={draft.locationRequests[row.locality] ?? 0}
                        onChange={(event) => setAreaRequest(row.locality, Number(event.target.value))}
                        aria-invalid={Boolean(limitErrors[row.locality])}
                        aria-describedby={
                          limitErrors[row.locality] ? `req-error-${row.locality}` : undefined
                        }
                      />
                      {limitErrors[row.locality] ? (
                        <p
                          id={`req-error-${row.locality}`}
                          className="mt-1.5 text-xs font-medium text-rose-700"
                          role="alert"
                        >
                          {limitErrors[row.locality]}
                        </p>
                      ) : row.available != null ? (
                        <p className="mt-1 text-[11px] text-muted">
                          Enter a number up to {formatNumber(row.available)} for {row.locality}.
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-muted">Set schedule to unlock availability limits.</p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          {!availability.disconnected &&
          availability.totals.available === 0 &&
          (availability.scheduleReady || availability.isPreview) &&
          !availability.loading ? (
            <p className="border-t border-navy/[0.06] px-4 py-3 text-sm text-muted">
              No autos are available for this window. Try different dates, hours, weekdays, or nearby areas once live
              inventory supports alternatives.
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
