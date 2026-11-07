import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  fetchCampaigns,
  fetchCampaignStatusEvents,
  postCampaignAction,
  type CampaignStatusEventRow,
} from '../api/campaignsApi'
import { ApiError } from '../api/httpClient'
import { IconSearch } from '../components/dashboard/DashboardIcons'
import { Button, ButtonLink } from '../components/ui/Button'
import { Callout } from '../components/ui/Callout'
import { Card, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { PageLayout } from '../components/ui/PageLayout'
import { Timeline } from '../components/ui/Timeline'
import { useAdvertiser } from '../context/AdvertiserContext'
import { canCreateCampaignDraft } from '../lib/access'
import { loadAuthSession } from '../lib/authSession'
import {
  deriveApprovalStatus,
  LIFECYCLE_STATUSES,
  permittedCampaignActions,
} from '../lib/campaignLifecycle'
import { isApiConfigured } from '../lib/config'
import { formatInr, formatIsoDate, formatNumber } from '../lib/format'
import { campaignStatusClass } from '../lib/statusStyles'
import type { CampaignRow, CampaignStatus } from '../types/advertiser'

const filterFieldClass =
  'mt-1 w-full rounded-xl border border-navy/12 bg-white px-3 py-2.5 text-sm text-navy outline-none transition focus:border-teal/40 focus:ring-2 focus:ring-teal/10'

const PAGE_SIZE = 10

function formatCompactInr(value: number) {
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1).replace(/\.0$/, '')}L`
  if (value >= 1_000) return `₹${Math.round(value / 1_000)}K`
  return formatInr(value)
}

function thumbClass(name: string) {
  const palettes = [
    'from-orange-400 to-rose-500',
    'from-sky-400 to-indigo-500',
    'from-violet-400 to-purple-600',
    'from-emerald-400 to-teal-600',
  ]
  return palettes[name.length % palettes.length]
}

export function CampaignsPage() {
  const { account } = useAdvertiser()
  const [params, setParams] = useSearchParams()
  const statusFilter = (params.get('status') as CampaignStatus | 'all' | null) || 'all'
  const locationFilter = params.get('location') || 'all'
  const dateFrom = params.get('from') || ''
  const dateTo = params.get('to') || ''
  const page = Math.max(1, Number(params.get('page') || '1') || 1)
  const [query, setQuery] = useState(params.get('q') ?? '')
  const canDraft = canCreateCampaignDraft(account.verificationStatus)

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [total, setTotal] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [locationOptions, setLocationOptions] = useState<string[]>([])
  const [events, setEvents] = useState<CampaignStatusEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionNote, setActionNote] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const apiReady = isApiConfigured()
  const hasSession = Boolean(loadAuthSession()?.accessToken)

  const filtersActive =
    statusFilter !== 'all' ||
    locationFilter !== 'all' ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(query.trim()) ||
    page > 1

  const listQuery = useMemo(
    () => ({
      q: query.trim() || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      location: locationFilter !== 'all' ? locationFilter : undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [query, statusFilter, locationFilter, dateFrom, dateTo, page],
  )

  const loadCampaigns = useCallback(
    async (signal?: AbortSignal) => {
      if (!apiReady) {
        setLoading(false)
        setError('NestJS API is not configured (VITE_API_BASE_URL). Campaigns require the backend.')
        setCampaigns([])
        setTotal(0)
        return
      }
      if (!hasSession) {
        setLoading(false)
        setError('Sign in under Settings → Security to load your company campaigns from the database.')
        setCampaigns([])
        setTotal(0)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const result = await fetchCampaigns(listQuery, signal)
        if (signal?.aborted) return
        setCampaigns(result.items)
        setTotal(result.total)
        setPageCount(result.pageCount)
        setLocationOptions(result.locations)
        if (result.page > result.pageCount && result.pageCount >= 1) {
          const next = new URLSearchParams(params)
          next.set('page', String(result.pageCount))
          setParams(next, { replace: true })
        }
      } catch (err) {
        if (signal?.aborted) return
        const message =
          err instanceof ApiError
            ? err.status === 401 || err.status === 403
              ? 'Session expired or not authorized for this advertiser company. Sign in again.'
              : err.message
            : err instanceof Error
              ? err.message
              : 'Failed to load campaigns'
        setError(message)
        setCampaigns([])
        setTotal(0)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [apiReady, hasSession, listQuery, params, setParams],
  )

  const loadEvents = useCallback(
    async (signal?: AbortSignal) => {
      if (!apiReady || !hasSession) {
        setEvents([])
        setEventsLoading(false)
        return
      }
      setEventsLoading(true)
      try {
        const result = await fetchCampaignStatusEvents({ page: 1, pageSize: 30 }, signal)
        if (signal?.aborted) return
        setEvents(result.items)
      } catch {
        if (!signal?.aborted) setEvents([])
      } finally {
        if (!signal?.aborted) setEventsLoading(false)
      }
    },
    [apiReady, hasSession],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadCampaigns(controller.signal)
    return () => controller.abort()
  }, [loadCampaigns])

  useEffect(() => {
    const controller = new AbortController()
    void loadEvents(controller.signal)
    return () => controller.abort()
  }, [loadEvents])

  // Keep local query input synced when URL is restored (refresh / back)
  useEffect(() => {
    setQuery(params.get('q') ?? '')
  }, [params])

  function updateParams(patch: Record<string, string | null>, resetPage = true) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '' || value === 'all') next.delete(key)
      else next.set(key, value)
    }
    if (resetPage && !('page' in patch)) next.delete('page')
    setParams(next)
  }

  function clearFilters() {
    setQuery('')
    setParams(new URLSearchParams())
  }

  async function runAction(campaign: CampaignRow, action: 'pause' | 'resume' | 'cancel' | 'duplicate') {
    setBusyId(campaign.id)
    setActionNote(null)
    try {
      await postCampaignAction(campaign.id, action)
      setActionNote(
        action === 'duplicate'
          ? `Draft copy created from ${campaign.id}.`
          : `Campaign ${campaign.id} ${action}d. Status event recorded in the database.`,
      )
      await Promise.all([loadCampaigns(), loadEvents()])
    } catch (err) {
      setActionNote(err instanceof Error ? err.message : `Could not ${action} campaign`)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <PageLayout className="max-w-[88rem] space-y-6">
      <PageHeader
        title="Campaigns"
        description="Manage and track all your advertising campaigns."
        actions={
          canDraft ? (
            <ButtonLink to="/campaigns/create">+ Create Campaign</ButtonLink>
          ) : (
            <ButtonLink to="/settings" variant="secondary">
              Complete verification to create campaigns
            </ButtonLink>
          )
        }
      />

      <Callout variant="measurement">
        Campaigns are loaded from NestJS for your authenticated company only. Submission is not approval; approval is
        not inventory allocation; Live requires actual delivery scheduling — this list does not invent playback.
      </Callout>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
          {hasSession ? (
            <Button variant="secondary" size="sm" className="ml-3" onClick={() => void loadCampaigns()}>
              Retry
            </Button>
          ) : (
            <ButtonLink to="/settings" variant="secondary" size="sm" className="ml-3">
              Open Settings
            </ButtonLink>
          )}
        </p>
      ) : null}

      {actionNote ? (
        <p className="rounded-xl border border-teal/25 bg-teal-muted/30 px-4 py-3 text-sm text-navy" role="status">
          {actionNote}
          <button type="button" className="ml-3 text-xs font-semibold text-teal underline" onClick={() => setActionNote(null)}>
            Dismiss
          </button>
        </p>
      ) : null}

      <Card padding="md" className="!p-0 overflow-hidden">
        <div className="border-b border-navy/[0.06] bg-paper/40 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-navy">All campaigns</h2>
              <p className="mt-0.5 text-sm text-muted">
                {loading ? 'Loading…' : `${formatNumber(total)} campaign${total === 1 ? '' : 's'}`}
                {filtersActive && !loading ? ' · filters applied' : ''}
                {!loading && total > 0 ? ` · page ${page} of ${pageCount}` : ''}
              </p>
            </div>
            {filtersActive ? (
              <Button variant="secondary" size="sm" onClick={clearFilters} className="shrink-0">
                Clear filters
              </Button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <label className="relative sm:col-span-2 xl:col-span-2 text-xs font-semibold text-muted">
              Search by campaign name or ID
              <IconSearch className="pointer-events-none absolute left-3 top-[2.15rem] h-4 w-4 text-muted" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  updateParams({ q: event.target.value || null })
                }}
                className={`${filterFieldClass} pl-9`}
                placeholder="Name or ID"
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Status
              <select
                value={statusFilter}
                onChange={(event) => updateParams({ status: event.target.value === 'all' ? null : event.target.value })}
                className={filterFieldClass}
              >
                <option value="all">All statuses</option>
                {LIFECYCLE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted">
              Target location
              <select
                value={locationFilter}
                onChange={(event) =>
                  updateParams({ location: event.target.value === 'all' ? null : event.target.value })
                }
                className={filterFieldClass}
              >
                <option value="all">All locations</option>
                {locationOptions.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted">
              Start from
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => updateParams({ from: event.target.value || null })}
                className={filterFieldClass}
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              End by
              <input
                type="date"
                value={dateTo}
                onChange={(event) => updateParams({ to: event.target.value || null })}
                className={filterFieldClass}
              />
            </label>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-6">
          {loading ? (
            <div className="skeleton h-48 rounded-xl" aria-busy="true" />
          ) : campaigns.length === 0 ? (
            <EmptyState
              title={total === 0 && !filtersActive ? 'No campaigns yet' : 'No campaigns match your filters'}
              description={
                !apiReady || !hasSession
                  ? 'Connect and sign in to load campaigns from the database.'
                  : filtersActive
                    ? 'Try clearing filters or adjusting the date range. Count reflects database results for your company.'
                    : 'Create a campaign to request auto-rickshaw inventory across Bengaluru locations.'
              }
              action={
                !hasSession ? (
                  <ButtonLink to="/settings" size="sm">
                    Sign in
                  </ButtonLink>
                ) : total === 0 && !filtersActive && canDraft ? (
                  <ButtonLink to="/campaigns/create" size="sm">
                    Create campaign
                  </ButtonLink>
                ) : filtersActive ? (
                  <Button size="sm" variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <ul className="space-y-3 lg:hidden">
                {campaigns.map((campaign) => {
                  const actions = permittedCampaignActions(campaign.status)
                  const approval = campaign.approvalStatus || deriveApprovalStatus(campaign.status)
                  return (
                    <li key={campaign.id} className="rounded-xl border border-navy/[0.06] bg-white p-4 shadow-sm">
                      <div className="flex gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br ${thumbClass(campaign.name)}`}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <Link to={`/campaigns/${campaign.id}`} className="font-semibold text-navy hover:text-teal">
                            {campaign.name}
                          </Link>
                          <p className="font-mono text-[11px] text-muted">{campaign.id}</p>
                          <p className="mt-1.5 text-xs text-muted">
                            {campaign.startDate ? formatIsoDate(campaign.startDate) : '—'} –{' '}
                            {campaign.endDate ? formatIsoDate(campaign.endDate) : '—'}
                          </p>
                          <p className="truncate text-xs text-muted">{campaign.locations.join(', ') || '—'}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={campaignStatusClass(campaign.status)}>{campaign.status}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                              {approval}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs tabular-nums text-muted">
                            {formatNumber(campaign.requestedAutos)} requested
                            {campaign.allocatedAutos > 0
                              ? ` · ${formatNumber(campaign.allocatedAutos)} allocated`
                              : ' · allocation pending'}{' '}
                            · {campaign.budgetInr ? formatInr(campaign.budgetInr) : '—'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <ButtonLink to={`/campaigns/${campaign.id}`} variant="secondary" size="sm">
                              View
                            </ButtonLink>
                            {actions.pause ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={busyId === campaign.id}
                                onClick={() => void runAction(campaign, 'pause')}
                              >
                                Pause
                              </Button>
                            ) : null}
                            {actions.resume ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={busyId === campaign.id}
                                onClick={() => void runAction(campaign, 'resume')}
                              >
                                Resume
                              </Button>
                            ) : null}
                            {actions.duplicate ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busyId === campaign.id}
                                onClick={() => void runAction(campaign, 'duplicate')}
                              >
                                Duplicate
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="hidden overflow-hidden rounded-xl border border-navy/[0.06] lg:block">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="border-b border-navy/[0.08] bg-paper/70 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    <tr>
                      <th className="w-[18%] px-4 py-3">Campaign</th>
                      <th className="w-[10%] px-4 py-3">ID</th>
                      <th className="w-[9%] px-4 py-3">Start</th>
                      <th className="w-[9%] px-4 py-3">End</th>
                      <th className="w-[13%] px-4 py-3">Locations</th>
                      <th className="w-[7%] px-4 py-3">Requested</th>
                      <th className="w-[8%] px-4 py-3">Budget</th>
                      <th className="w-[8%] px-4 py-3">Status</th>
                      <th className="w-[9%] px-4 py-3">Approval</th>
                      <th className="w-[9%] px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy/[0.05] bg-white">
                    {campaigns.map((campaign) => {
                      const actions = permittedCampaignActions(campaign.status)
                      const approval = campaign.approvalStatus || deriveApprovalStatus(campaign.status)
                      return (
                        <tr key={campaign.id} className="align-middle transition-colors hover:bg-paper/40">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`flex h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br ${thumbClass(campaign.name)}`}
                                aria-hidden
                              />
                              <Link
                                to={`/campaigns/${campaign.id}`}
                                className="line-clamp-2 font-semibold leading-snug text-navy hover:text-teal"
                              >
                                {campaign.name}
                              </Link>
                            </div>
                          </td>
                          <td className="truncate px-4 py-3 font-mono text-[11px] text-muted" title={campaign.id}>
                            {campaign.id}
                          </td>
                          <td className="px-4 py-3 text-xs leading-snug text-muted">
                            {campaign.startDate ? formatIsoDate(campaign.startDate) : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs leading-snug text-muted">
                            {campaign.endDate ? formatIsoDate(campaign.endDate) : '—'}
                          </td>
                          <td className="truncate px-4 py-3 text-xs text-muted" title={campaign.locations.join(', ')}>
                            {campaign.locations.join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-navy">
                            {formatNumber(campaign.requestedAutos)}
                          </td>
                          <td className="px-4 py-3 tabular-nums font-medium text-navy">
                            {campaign.budgetInr ? formatCompactInr(campaign.budgetInr) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`${campaignStatusClass(campaign.status)} !px-2 !py-0.5 !text-[10px]`}>
                              {campaign.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200"
                              title={approval}
                            >
                              {approval}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              <ButtonLink
                                to={`/campaigns/${campaign.id}`}
                                variant="ghost"
                                size="sm"
                                className="!px-2 !text-xs"
                              >
                                View
                              </ButtonLink>
                              {actions.pause ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="!px-2 !text-xs"
                                  disabled={busyId === campaign.id}
                                  onClick={() => void runAction(campaign, 'pause')}
                                >
                                  Pause
                                </Button>
                              ) : null}
                              {actions.resume ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="!px-2 !text-xs"
                                  disabled={busyId === campaign.id}
                                  onClick={() => void runAction(campaign, 'resume')}
                                >
                                  Resume
                                </Button>
                              ) : null}
                              {actions.duplicate ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="!px-2 !text-xs"
                                  disabled={busyId === campaign.id}
                                  onClick={() => void runAction(campaign, 'duplicate')}
                                >
                                  Copy
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {pageCount > 1 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {formatNumber(total)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => updateParams({ page: String(page - 1) }, false)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= pageCount}
                      onClick={() => updateParams({ page: String(page + 1) }, false)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </Card>

      <Card padding="md">
        <CardHeader
          title="Approval history"
          description="Audit trail from CampaignStatusEvent records — only real status transitions, never fabricated"
        />
        {eventsLoading ? (
          <div className="skeleton h-28 rounded-xl" aria-busy="true" />
        ) : events.length === 0 ? (
          <EmptyState
            title="No status events yet"
            description="Events appear when a campaign is created, submitted, paused, resumed, cancelled, or when admin/delivery transitions are recorded in the database."
          />
        ) : (
          <Timeline
            items={events.map((event) => ({
              id: event.id,
              title: event.campaignName,
              badge: <span className={campaignStatusClass(event.status as CampaignStatus)}>{event.status}</span>,
              meta: (
                <span className="text-xs text-muted">
                  {event.atDisplay}
                  {event.previousStatus ? ` · ${event.previousStatus} → ${event.status}` : ''}
                  {event.actorLabel ? ` · ${event.actorLabel}` : ''}
                </span>
              ),
              body: event.note || 'Status change recorded.',
            }))}
          />
        )}
      </Card>
    </PageLayout>
  )
}
