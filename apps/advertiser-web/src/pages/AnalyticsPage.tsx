import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  IconCampaigns,
  IconCheck,
  IconClock,
  IconPlay,
  IconPulse,
  IconScreen,
  IconSpend,
} from '../components/dashboard/DashboardIcons'
import { Button, ButtonLink } from '../components/ui/Button'
import { Callout } from '../components/ui/Callout'
import { Card, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { PageLayout } from '../components/ui/PageLayout'
import { useWorkspace } from '../context/AdvertiserWorkspaceContext'
import {
  filterTrend,
  type DashboardRange,
  type DashboardRangePreset,
} from '../lib/dashboardMetrics'
import { formatInr, formatNumber } from '../lib/format'
import { campaignStatusClass } from '../lib/statusStyles'
import type { PerformancePoint, PlaybackReportRow } from '../types/advertiser'

type SortKey =
  | 'name'
  | 'status'
  | 'starts'
  | 'successful'
  | 'failed'
  | 'hours'
  | 'rate'
  | 'spend'

function MetricCard({
  label,
  value,
  hint,
  icon,
  iconWrap,
  awaiting,
}: {
  label: string
  value: string
  hint: string
  icon: ReactNode
  iconWrap: string
  awaiting?: boolean
}) {
  return (
    <article className="flex gap-3 rounded-2xl border border-navy/[0.06] bg-card p-4 shadow-[var(--shadow-card)]">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconWrap}`} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        {awaiting ? (
          <>
            <p className="mt-0.5 text-lg font-bold text-navy">—</p>
            <p className="mt-1 text-[11px] leading-snug text-amber-800">Awaiting verified playback data</p>
          </>
        ) : (
          <>
            <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-navy">{value}</p>
            <p className="mt-1 text-[11px] leading-snug text-muted">{hint}</p>
          </>
        )}
      </div>
    </article>
  )
}

function PlaybackPerformanceChart({ points }: { points: PerformancePoint[] }) {
  const [hover, setHover] = useState<number | null>(null)

  if (points.length === 0) {
    return (
      <EmptyState
        title="No verified playback trend"
        description="Successful and failed ad plays appear after devices report Proof of Play. This chart does not show planned schedules or fabricated trends."
      />
    )
  }

  const width = 720
  const height = 220
  const pad = { l: 44, r: 16, t: 16, b: 32 }
  const series = points.map((p) => ({
    date: p.date,
    successful: p.completedPlays,
    failed: Math.max(0, p.playbackStarts - p.completedPlays),
    starts: p.playbackStarts,
  }))
  const max = Math.max(...series.flatMap((p) => [p.successful, p.failed, p.starts]), 1)
  const innerW = width - pad.l - pad.r
  const innerH = height - pad.t - pad.b
  const toX = (i: number) => pad.l + (i * innerW) / Math.max(series.length - 1, 1)
  const toY = (v: number) => pad.t + innerH - (v / max) * innerH
  const successPath = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.successful)}`).join(' ')
  const failedPath = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.failed)}`).join(' ')
  const successArea = `${successPath} L ${toX(series.length - 1)} ${pad.t + innerH} L ${toX(0)} ${pad.t + innerH} Z`
  const step = Math.max(1, Math.ceil(series.length / 7))
  const tip = hover != null ? series[hover] : null

  return (
    <div className="relative">
      <ul className="mb-3 flex flex-wrap gap-4 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-teal" /> Successful plays
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Failed / incomplete (starts − successful)
        </li>
      </ul>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-52 w-full"
        role="img"
        aria-label="Playback performance over time"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="analyticsSuccessFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={pad.l}
            x2={width - pad.r}
            y1={pad.t + innerH - frac * innerH}
            y2={pad.t + innerH - frac * innerH}
            stroke="#0a1a32"
            strokeOpacity="0.06"
          />
        ))}
        <path d={successArea} fill="url(#analyticsSuccessFill)" />
        <path d={successPath} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={failedPath} fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" />
        {series.map((p, i) => (
          <g key={p.date}>
            <circle
              cx={toX(i)}
              cy={toY(p.successful)}
              r={hover === i ? 5 : 3.5}
              fill="#0d9488"
              className="cursor-pointer"
              onMouseEnter={() => setHover(i)}
            />
            <circle
              cx={toX(i)}
              cy={toY(p.failed)}
              r={hover === i ? 4 : 3}
              fill="#f43f5e"
              className="cursor-pointer"
              onMouseEnter={() => setHover(i)}
            />
            {(i % step === 0 || i === series.length - 1) && (
              <text x={toX(i)} y={height - 10} textAnchor="middle" fill="#64748b" fontSize="10">
                {p.date}
              </text>
            )}
            <rect
              x={toX(i) - innerW / series.length / 2}
              y={pad.t}
              width={Math.max(8, innerW / series.length)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>
      {tip ? (
        <div className="pointer-events-none absolute left-1/2 top-10 z-10 -translate-x-1/2 rounded-xl border border-navy/10 bg-white px-3 py-2 text-xs shadow-[var(--shadow-elevated)]">
          <p className="font-semibold text-navy">{tip.date}</p>
          <p className="mt-1 text-muted">Starts: {formatNumber(tip.starts)}</p>
          <p className="text-teal">Successful: {formatNumber(tip.successful)}</p>
          <p className="text-rose-600">Failed / incomplete: {formatNumber(tip.failed)}</p>
        </div>
      ) : null}
      <p className="mt-2 text-[11px] text-muted">
        Failed / incomplete is derived as playback starts minus successful completions for the day — not a separate
        interrupted-event stream until the analytics API provides one.
      </p>
    </div>
  )
}

export function AnalyticsPage() {
  const { data, loading, error, connectionNotice, reload } = useWorkspace()
  const {
    analytics,
    geographicDistribution,
    playbackReports,
    livePerformanceTrend,
    campaigns,
    invoices,
    paymentHistory,
    measurementNote,
  } = data

  const [range, setRange] = useState<DashboardRange>({ preset: '30d', from: '', to: '' })
  const [campaignId, setCampaignId] = useState<string>('all')
  const [location, setLocation] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const locationOptions = useMemo(() => {
    const set = new Set<string>()
    campaigns.forEach((c) => c.locations.forEach((loc) => set.add(loc)))
    geographicDistribution.forEach((row) => set.add(row.area))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [campaigns, geographicDistribution])

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (campaignId !== 'all' && c.id !== campaignId) return false
      if (location !== 'all' && !c.locations.includes(location)) return false
      return true
    })
  }, [campaigns, campaignId, location])

  const filteredReports = useMemo(() => {
    return playbackReports.filter((row) => {
      if (campaignId !== 'all' && row.campaignId !== campaignId) return false
      const campaign = campaigns.find((c) => c.id === row.campaignId)
      if (location !== 'all' && campaign && !campaign.locations.includes(location)) return false
      if (location !== 'all' && !campaign) return false
      return true
    })
  }, [playbackReports, campaigns, campaignId, location])

  const filteredTrend = useMemo(() => filterTrend(livePerformanceTrend, range), [livePerformanceTrend, range])

  const hasVerifiedPlayback =
    filteredReports.some((r) => r.playbackStarts > 0 || r.completedPlays > 0) ||
    filteredTrend.some((p) => p.playbackStarts > 0 || p.completedPlays > 0) ||
    (campaignId === 'all' &&
      location === 'all' &&
      (analytics.playbackStarts > 0 || analytics.completedAdvertisements > 0))

  const overview = useMemo(() => {
    if (filteredReports.length > 0) {
      const starts = filteredReports.reduce((s, r) => s + r.playbackStarts, 0)
      const successful = filteredReports.reduce((s, r) => s + r.completedPlays, 0)
      const failed = filteredReports.reduce((s, r) => s + r.interruptedPlays, 0)
      const hours = filteredReports.reduce((s, r) => s + r.runningHours, 0)
      const rate = starts > 0 ? Math.round((successful / starts) * 1000) / 10 : 0
      return { starts, successful, failed, hours, rate, fromReports: true }
    }
    if (campaignId === 'all' && location === 'all') {
      return {
        starts: analytics.playbackStarts,
        successful: analytics.completedAdvertisements,
        failed: analytics.interruptedAdvertisements,
        hours: analytics.campaignRunningHours,
        rate: analytics.playbackCompletionRate,
        fromReports: false,
      }
    }
    return { starts: 0, successful: 0, failed: 0, hours: 0, rate: 0, fromReports: false }
  }, [filteredReports, analytics, campaignId, location])

  const allocatedAutos = useMemo(
    () => filteredCampaigns.reduce((sum, c) => sum + (c.allocatedAutos || 0), 0),
    [filteredCampaigns],
  )

  const locationRows = useMemo(() => {
    if (geographicDistribution.length > 0) {
      return geographicDistribution
        .filter((row) => location === 'all' || row.area === location)
        .map((row) => {
          const assigned = campaigns
            .filter((c) => (campaignId === 'all' || c.id === campaignId) && c.locations.includes(row.area))
            .reduce((sum, c) => sum + (c.allocatedAutos || c.requestedAutos || 0), 0)
          const related = filteredReports.filter((r) => {
            const c = campaigns.find((x) => x.id === r.campaignId)
            return c?.locations.includes(row.area)
          })
          const starts = related.reduce((s, r) => s + r.playbackStarts, 0)
          const successful = related.length
            ? related.reduce((s, r) => s + r.completedPlays, 0)
            : row.completedPlays
          const failed = related.reduce((s, r) => s + r.interruptedPlays, 0)
          const rate = starts > 0 ? Math.round((successful / starts) * 1000) / 10 : related.length ? 0 : null
          return {
            area: row.area,
            assignedAutos: assigned || row.targetedDevices,
            successful,
            failed: related.length ? failed : null,
            rate,
            verified: related.length > 0 || row.completedPlays > 0,
          }
        })
    }

    // Planned locations only — no fabricated plays
    const map = new Map<string, number>()
    filteredCampaigns.forEach((c) => {
      c.locations.forEach((area) => {
        map.set(area, (map.get(area) ?? 0) + (c.allocatedAutos || c.requestedAutos || 0))
      })
    })
    return [...map.entries()].map(([area, assignedAutos]) => ({
      area,
      assignedAutos,
      successful: null as number | null,
      failed: null as number | null,
      rate: null as number | null,
      verified: false,
    }))
  }, [geographicDistribution, campaigns, filteredCampaigns, filteredReports, campaignId, location])

  const reportByCampaign = useMemo(() => {
    const map = new Map<string, PlaybackReportRow>()
    filteredReports.forEach((row) => map.set(row.campaignId, row))
    return map
  }, [filteredReports])

  const campaignTableRows = useMemo(() => {
    const rows = filteredCampaigns.map((campaign) => {
      const report = reportByCampaign.get(campaign.id)
      return {
        campaign,
        starts: report?.playbackStarts ?? null,
        successful: report?.completedPlays ?? null,
        failed: report?.interruptedPlays ?? null,
        hours: report?.runningHours ?? null,
        rate: report?.completionRate ?? null,
        spend: report?.expenditureInr ?? null,
      }
    })

    rows.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const num = (x: number | null) => x ?? -1
      switch (sortKey) {
        case 'status':
          return a.campaign.status.localeCompare(b.campaign.status) * dir
        case 'starts':
          return (num(a.starts) - num(b.starts)) * dir
        case 'successful':
          return (num(a.successful) - num(b.successful)) * dir
        case 'failed':
          return (num(a.failed) - num(b.failed)) * dir
        case 'hours':
          return (num(a.hours) - num(b.hours)) * dir
        case 'rate':
          return (num(a.rate) - num(b.rate)) * dir
        case 'spend':
          return (num(a.spend) - num(b.spend)) * dir
        default:
          return a.campaign.name.localeCompare(b.campaign.name) * dir
      }
    })
    return rows
  }, [filteredCampaigns, reportByCampaign, sortKey, sortDir])

  /** Billing: paid amounts only — never invent spend from budgets. */
  const committedBudget = useMemo(
    () =>
      filteredCampaigns
        .filter((c) => !['Draft', 'Cancelled', 'Rejected'].includes(c.status))
        .reduce((sum, c) => sum + (c.budgetInr || 0), 0),
    [filteredCampaigns],
  )
  const actualExpenditure = useMemo(() => {
    const paidPayments = paymentHistory
      .filter((row) => row.status === 'Paid')
      .filter((row) => {
        if (campaignId === 'all') return true
        const c = campaigns.find((x) => x.id === campaignId)
        return c ? row.campaignName === c.name : false
      })
      .reduce((sum, row) => sum + row.amountInr, 0)
    if (paidPayments > 0) return paidPayments
    const paidInvoices = invoices
      .filter((inv) => inv.paymentStatus === 'Paid')
      .filter((inv) => {
        if (campaignId === 'all') return true
        const c = campaigns.find((x) => x.id === campaignId)
        return c ? inv.campaignName === c.name : false
      })
      .reduce((sum, inv) => sum + inv.amountInr, 0)
    return paidInvoices > 0 ? paidInvoices : null
  }, [paymentHistory, invoices, campaigns, campaignId])

  const remainingBudget =
    actualExpenditure != null && committedBudget > 0 ? Math.max(0, committedBudget - actualExpenditure) : null

  function resetFilters() {
    setRange({ preset: '30d', from: '', to: '' })
    setCampaignId('all')
    setLocation('all')
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const rangePresets: { id: DashboardRangePreset; label: string }[] = [
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 90 days' },
    { id: 'custom', label: 'Custom' },
  ]

  return (
    <PageLayout className="max-w-[88rem] space-y-6">
      <PageHeader
        title="Campaign Analytics"
        description="Monitor advertisement delivery, playback performance and campaign expenditure."
        actions={
          <>
            <ButtonLink to="/campaigns" variant="secondary">
              Campaigns
            </ButtonLink>
            <ButtonLink to="/campaigns/create">Create campaign</ButtonLink>
          </>
        }
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          <p className="font-semibold">Could not load analytics</p>
          <p className="mt-1">{error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={reload}>
            Retry
          </Button>
        </div>
      ) : null}

      {connectionNotice ? <Callout variant="info">{connectionNotice}</Callout> : null}

      <Callout variant="measurement">
        {measurementNote} Filters refine the local workspace view. Zeroes are not shown as success — when Proof of Play
        is missing, KPIs show awaiting verified data. Demo/sample campaigns are not live fleet results.
      </Callout>

      {/* Filters */}
      <Card padding="sm" className="!p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="text-xs font-semibold text-muted">
            Date range
            <select
              className="mt-1 block w-full rounded-xl border border-navy/12 bg-white px-3 py-2 text-sm text-navy lg:min-w-[10rem]"
              value={range.preset}
              onChange={(event) =>
                setRange({
                  preset: event.target.value as DashboardRangePreset,
                  from: range.from,
                  to: range.to,
                })
              }
            >
              {rangePresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          {range.preset === 'custom' ? (
            <>
              <label className="text-xs font-semibold text-muted">
                From
                <input
                  type="date"
                  className="mt-1 block rounded-xl border border-navy/12 bg-white px-3 py-2 text-sm text-navy"
                  value={range.from}
                  onChange={(event) => setRange({ ...range, from: event.target.value })}
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                To
                <input
                  type="date"
                  className="mt-1 block rounded-xl border border-navy/12 bg-white px-3 py-2 text-sm text-navy"
                  value={range.to}
                  onChange={(event) => setRange({ ...range, to: event.target.value })}
                />
              </label>
            </>
          ) : null}
          <label className="min-w-[12rem] flex-1 text-xs font-semibold text-muted">
            Campaign
            <select
              className="mt-1 block w-full rounded-xl border border-navy/12 bg-white px-3 py-2 text-sm text-navy"
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value)}
            >
              <option value="all">All campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[10rem] text-xs font-semibold text-muted">
            Target location
            <select
              className="mt-1 block w-full rounded-xl border border-navy/12 bg-white px-3 py-2 text-sm text-navy"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            >
              <option value="all">All locations</option>
              {locationOptions.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>
          <Button variant="secondary" size="sm" onClick={resetFilters}>
            Reset filters
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Playback Starts"
            value={formatNumber(overview.starts)}
            hint="Device-reported ad start events (Proof of Play)"
            icon={<IconPlay className="h-5 w-5" />}
            iconWrap="bg-sky-50 text-sky-700"
            awaiting={!hasVerifiedPlayback}
          />
          <MetricCard
            label="Successful Ad Plays"
            value={formatNumber(overview.successful)}
            hint="Completed playback events — not passenger impressions"
            icon={<IconCheck className="h-5 w-5" />}
            iconWrap="bg-emerald-50 text-emerald-700"
            awaiting={!hasVerifiedPlayback}
          />
          <MetricCard
            label="Failed Ad Plays"
            value={formatNumber(overview.failed)}
            hint="Interrupted or incomplete plays from device telemetry"
            icon={<IconPulse className="h-5 w-5" />}
            iconWrap="bg-rose-50 text-rose-700"
            awaiting={!hasVerifiedPlayback}
          />
          <MetricCard
            label="Total Playback Duration"
            value={`${formatNumber(overview.hours)} hrs`}
            hint="Validated campaign running hours from reports"
            icon={<IconClock className="h-5 w-5" />}
            iconWrap="bg-violet-50 text-violet-700"
            awaiting={!hasVerifiedPlayback}
          />
          <MetricCard
            label="Allocated Auto-Rickshaws"
            value={formatNumber(allocatedAutos)}
            hint="Planned allocation from campaigns — not live device online count"
            icon={<IconScreen className="h-5 w-5" />}
            iconWrap="bg-indigo-50 text-indigo-700"
            awaiting={false}
          />
          <MetricCard
            label="Playback Completion Rate"
            value={hasVerifiedPlayback ? `${overview.rate}%` : '—'}
            hint="Successful plays ÷ playback starts"
            icon={<IconCampaigns className="h-5 w-5" />}
            iconWrap="bg-teal-50 text-teal-700"
            awaiting={!hasVerifiedPlayback}
          />
        </section>
      )}

      <Card padding="md">
        <CardHeader
          title="Playback performance"
          description="Date-wise successful and failed / incomplete plays from verified telemetry"
        />
        <PlaybackPerformanceChart points={filteredTrend} />
      </Card>

      <Card padding="md">
        <CardHeader
          title="Location performance"
          description="Bengaluru target areas — GPS pins are not shown. Plays appear only from verified reports."
        />
        {locationRows.length === 0 ? (
          <EmptyState
            title="No target locations"
            description="Select locations when creating campaigns. Delivery by area appears after Proof of Play is connected."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-navy/[0.08] text-[10px] font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2.5 pr-3">Location</th>
                  <th className="py-2.5 pr-3">Assigned autos</th>
                  <th className="py-2.5 pr-3">Successful plays</th>
                  <th className="py-2.5 pr-3">Failed plays</th>
                  <th className="py-2.5">Completion rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/[0.06]">
                {locationRows.map((row) => (
                  <tr key={row.area}>
                    <td className="py-3 pr-3 font-semibold text-navy">{row.area}</td>
                    <td className="py-3 pr-3 tabular-nums text-navy">{formatNumber(row.assignedAutos)}</td>
                    <td className="py-3 pr-3 tabular-nums text-muted">
                      {row.successful == null ? (
                        <span className="text-xs text-amber-800">Awaiting verified data</span>
                      ) : (
                        formatNumber(row.successful)
                      )}
                    </td>
                    <td className="py-3 pr-3 tabular-nums text-muted">
                      {row.failed == null ? '—' : formatNumber(row.failed)}
                    </td>
                    <td className="py-3 tabular-nums text-muted">
                      {row.rate == null ? '—' : `${row.rate}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card padding="md">
        <CardHeader
          title="Campaign performance report"
          description="Campaign plan fields plus Proof of Play columns when reports exist"
        />
        {campaignTableRows.length === 0 ? (
          <EmptyState
            title="No campaigns in this filter"
            description="Create a campaign or reset filters. Playback columns stay empty until device telemetry is connected."
            action={
              <ButtonLink to="/campaigns/create" size="sm">
                Create campaign
              </ButtonLink>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-[13px]">
              <thead className="border-b border-navy/[0.08] text-[10px] font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2.5 pr-2">
                    <button type="button" className="font-semibold" onClick={() => toggleSort('name')}>
                      Campaign
                    </button>
                  </th>
                  <th className="py-2.5 pr-2">
                    <button type="button" className="font-semibold" onClick={() => toggleSort('status')}>
                      Status
                    </button>
                  </th>
                  <th className="py-2.5 pr-2">Locations</th>
                  <th className="py-2.5 pr-2">Autos</th>
                  <th className="py-2.5 pr-2">
                    <button type="button" className="font-semibold" onClick={() => toggleSort('starts')}>
                      Starts
                    </button>
                  </th>
                  <th className="py-2.5 pr-2">
                    <button type="button" className="font-semibold" onClick={() => toggleSort('successful')}>
                      Successful
                    </button>
                  </th>
                  <th className="py-2.5 pr-2">
                    <button type="button" className="font-semibold" onClick={() => toggleSort('failed')}>
                      Failed
                    </button>
                  </th>
                  <th className="py-2.5 pr-2">
                    <button type="button" className="font-semibold" onClick={() => toggleSort('hours')}>
                      Duration
                    </button>
                  </th>
                  <th className="py-2.5 pr-2">
                    <button type="button" className="font-semibold" onClick={() => toggleSort('rate')}>
                      Rate
                    </button>
                  </th>
                  <th className="py-2.5 pr-2">
                    <button type="button" className="font-semibold" onClick={() => toggleSort('spend')}>
                      Expenditure
                    </button>
                  </th>
                  <th className="py-2.5"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/[0.06]">
                {campaignTableRows.map(({ campaign, starts, successful, failed, hours, rate, spend }) => (
                  <tr key={campaign.id} className="align-middle hover:bg-paper/40">
                    <td className="py-3 pr-2">
                      <Link to={`/campaigns/${campaign.id}`} className="font-semibold text-navy hover:text-teal">
                        {campaign.name}
                      </Link>
                      <p className="font-mono text-[10px] text-muted">{campaign.id}</p>
                    </td>
                    <td className="py-3 pr-2">
                      <span className={`${campaignStatusClass(campaign.status)} !text-[10px]`}>{campaign.status}</span>
                    </td>
                    <td className="max-w-[8rem] truncate py-3 pr-2 text-xs text-muted" title={campaign.locations.join(', ')}>
                      {campaign.locations.join(', ') || '—'}
                    </td>
                    <td className="py-3 pr-2 text-xs tabular-nums text-navy">
                      {formatNumber(campaign.requestedAutos)}/{formatNumber(campaign.allocatedAutos)}
                    </td>
                    <td className="py-3 pr-2 tabular-nums text-muted">
                      {starts == null ? '—' : formatNumber(starts)}
                    </td>
                    <td className="py-3 pr-2 tabular-nums text-muted">
                      {successful == null ? '—' : formatNumber(successful)}
                    </td>
                    <td className="py-3 pr-2 tabular-nums text-muted">
                      {failed == null ? '—' : formatNumber(failed)}
                    </td>
                    <td className="py-3 pr-2 tabular-nums text-muted">
                      {hours == null ? '—' : `${formatNumber(hours)}h`}
                    </td>
                    <td className="py-3 pr-2 tabular-nums text-muted">
                      {rate == null ? '—' : `${rate}%`}
                    </td>
                    <td className="py-3 pr-2 tabular-nums text-muted">
                      {spend == null ? '—' : formatInr(spend)}
                    </td>
                    <td className="py-3 text-right">
                      <ButtonLink to={`/campaigns/${campaign.id}`} variant="ghost" size="sm" className="!text-xs">
                        View Details
                      </ButtonLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!hasVerifiedPlayback ? (
              <p className="mt-3 text-xs text-muted">
                Playback and expenditure columns show “—” until NestJS / ClickHouse Proof of Play and billing rows are
                available. Autos and locations come from saved campaign plans only.
              </p>
            ) : null}
          </div>
        )}
      </Card>

      <Card padding="md">
        <CardHeader
          title="Budget analytics"
          description="Committed budget from campaigns vs paid billing rows — spend is never inferred from schedules"
          action={<IconSpend className="text-muted" aria-hidden />}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-navy/[0.06] bg-paper/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Committed budget</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-navy">
              {committedBudget > 0 ? formatInr(committedBudget) : '—'}
            </p>
            <p className="mt-1 text-[11px] text-muted">Sum of non-draft campaign budgets in the current filter</p>
          </div>
          <div className="rounded-xl border border-navy/[0.06] bg-paper/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Actual expenditure</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-navy">
              {actualExpenditure != null ? formatInr(actualExpenditure) : '—'}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {actualExpenditure != null
                ? 'From paid payment / invoice records only'
                : 'No paid billing rows yet — not estimated from budgets'}
            </p>
          </div>
          <div className="rounded-xl border border-navy/[0.06] bg-paper/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Remaining budget</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-navy">
              {remainingBudget != null ? formatInr(remainingBudget) : '—'}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Shown only when both committed budget and paid expenditure are available
            </p>
          </div>
        </div>
      </Card>
    </PageLayout>
  )
}
