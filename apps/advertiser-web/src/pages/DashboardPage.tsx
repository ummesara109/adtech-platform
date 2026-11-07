import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PlaysOverTimeChart } from '../components/dashboard/DashboardCharts'
import { DateRangePicker } from '../components/dashboard/DateRangePicker'
import {
  IconCalendar,
  IconCampaigns,
  IconClock,
  IconMapPin,
  IconPulse,
  IconScreen,
  IconSpend,
} from '../components/dashboard/DashboardIcons'
import { Button, ButtonLink } from '../components/ui/Button'
import { Callout } from '../components/ui/Callout'
import { Card, CardHeader } from '../components/ui/Card'
import { CountUp } from '../components/ui/CountUp'
import { EmptyState } from '../components/ui/EmptyState'
import { useAdvertiser } from '../context/AdvertiserContext'
import { useWorkspace } from '../context/AdvertiserWorkspaceContext'
import {
  buildDashboardMetrics,
  filterTrend,
  type DashboardRange,
} from '../lib/dashboardMetrics'
import { isApiConfigured } from '../lib/config'
import { formatInr, formatIsoDate, formatNumber } from '../lib/format'
import {
  hasSampleAdvertiserData,
  SAMPLE_COMPANY,
  seedNammaFoodsSampleData,
} from '../lib/sampleAdvertiserData'
import { TEST_PRICING } from '../lib/testPricing'
import { campaignStatusClass } from '../lib/statusStyles'
import type { CampaignRow, PerformancePoint } from '../types/advertiser'

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="skeleton h-20 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="skeleton h-[5.5rem]" />
        ))}
      </div>
      <div className="skeleton h-64 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-56" />
        <div className="skeleton h-56" />
      </div>
      <div className="skeleton h-72 w-full" />
    </div>
  )
}

type Kpi = {
  label: string
  value: number
  to: string
  format: 'number' | 'inr'
  icon: ReactNode
  iconWrap: string
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function parseIsoDay(iso: string) {
  const date = new Date(`${iso}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Committed budget on each calendar day from saved campaign start/end dates (not playback). */
function buildBudgetCalendarSeries(campaigns: CampaignRow[], range: DashboardRange) {
  const active = campaigns.filter(
    (c) => c.startDate && c.endDate && !['Draft', 'Cancelled', 'Rejected'].includes(c.status),
  )
  if (active.length === 0) return [] as { date: string; value: number }[]

  const end = startOfDay(new Date())
  const start = new Date(end)
  if (range.preset === '7d') start.setDate(start.getDate() - 6)
  else if (range.preset === '90d') start.setDate(start.getDate() - 89)
  else if (range.preset === 'today') {
    /* single day */
  } else start.setDate(start.getDate() - 29)

  const points: { date: string; value: number }[] = []
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const day = startOfDay(cursor)
    let value = 0
    for (const campaign of active) {
      const from = parseIsoDay(campaign.startDate)
      const to = parseIsoDay(campaign.endDate)
      if (!from || !to || day < startOfDay(from) || day > startOfDay(to)) continue
      const span = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1)
      value += (campaign.budgetInr || 0) / span
    }
    points.push({
      date: day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      value: Math.round(value),
    })
  }
  return points
}

function aggregateLocationTargets(campaigns: CampaignRow[]) {
  const map = new Map<string, { autos: number; campaigns: number }>()
  for (const campaign of campaigns) {
    for (const area of campaign.locations) {
      const row = map.get(area) ?? { autos: 0, campaigns: 0 }
      row.autos += campaign.allocatedAutos || campaign.requestedAutos || 0
      row.campaigns += 1
      map.set(area, row)
    }
  }
  return [...map.entries()]
    .map(([area, stats]) => ({ area, ...stats }))
    .sort((a, b) => b.autos - a.autos)
}

const AREA_LAYOUT: Record<string, { x: number; y: number }> = {
  Whitefield: { x: 82, y: 28 },
  Koramangala: { x: 48, y: 62 },
  Indiranagar: { x: 58, y: 52 },
  'HSR Layout': { x: 52, y: 72 },
  Marathahalli: { x: 72, y: 42 },
  'Electronic City': { x: 46, y: 88 },
  Hebbal: { x: 42, y: 22 },
  Yelahanka: { x: 38, y: 12 },
  BTM: { x: 44, y: 78 },
}

/** One active campaign on a calendar day = one campaign-day (not device hours). */
function buildWeekdayActivityBars(campaigns: CampaignRow[]) {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const counts = labels.map(() => 0)
  const eligible = campaigns.filter((c) => c.startDate && c.endDate && c.status !== 'Draft')
  for (const campaign of eligible) {
    const from = parseIsoDay(campaign.startDate)
    const to = parseIsoDay(campaign.endDate)
    if (!from || !to) continue
    for (let cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
      const idx = (cursor.getDay() + 6) % 7
      counts[idx]! += 1
    }
  }
  return labels.map((day, index) => ({ day, value: counts[index]! }))
}

function formatShortRange(start: string, end: string) {
  const stripYear = (iso: string) => formatIsoDate(iso).replace(/,?\s*\d{4}$/, '')
  if (!start && !end) return '—'
  if (!start) return stripYear(end)
  if (!end) return stripYear(start)
  return `${stripYear(start)} – ${stripYear(end)}`
}

function formatCompactInr(value: number) {
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1).replace(/\.0$/, '')}L`
  if (value >= 1_000) return `₹${Math.round(value / 1_000)}K`
  return formatInr(value)
}

function CampaignCommitmentLineChart({ points }: { points: { date: string; value: number }[] }) {
  if (points.length === 0) {
    return (
      <EmptyState
        title="No campaign calendar data"
        description="Load [TEST] sample campaigns or create campaigns with start and end dates."
      />
    )
  }

  const width = 800
  const height = 200
  const pad = { l: 52, r: 12, t: 8, b: 26 }
  const max = Math.max(...points.map((p) => p.value), 1)
  const innerW = width - pad.l - pad.r
  const innerH = height - pad.t - pad.b
  const toX = (index: number) => pad.l + (index * innerW) / Math.max(points.length - 1, 1)
  const toY = (value: number) => pad.t + innerH - (value / max) * innerH
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.value)}`).join(' ')
  const area = `${line} L ${toX(points.length - 1)} ${pad.t + innerH} L ${toX(0)} ${pad.t + innerH} Z`
  const step = Math.max(1, Math.ceil(points.length / 7))
  const yTicks = [0, 0.5, 1].map((frac) => ({ frac, label: formatCompactInr(max * frac) }))

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-[12.5rem] w-full max-w-none"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Campaign budget on calendar"
    >
      <defs>
        <linearGradient id="commitFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map(({ frac, label }) => (
        <g key={frac}>
          <line
            x1={pad.l}
            x2={width - pad.r}
            y1={pad.t + innerH - frac * innerH}
            y2={pad.t + innerH - frac * innerH}
            stroke="#0a1a32"
            strokeOpacity="0.06"
          />
          <text x={pad.l - 6} y={pad.t + innerH - frac * innerH + 3} textAnchor="end" fill="#64748b" fontSize="9">
            {label}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#commitFill)" />
      <path d={line} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) =>
        i % step === 0 || i === points.length - 1 ? (
          <g key={`${p.date}-${i}`}>
            <circle cx={toX(i)} cy={toY(p.value)} r="3.5" fill="#2563eb" />
            <text x={toX(i)} y={height - 10} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="500">
              {p.date}
            </text>
          </g>
        ) : null,
      )}
    </svg>
  )
}

function CampaignDistributionPanel({
  locations,
  city,
}: {
  locations: { area: string; autos: number; campaigns: number }[]
  city: string
}) {
  if (locations.length === 0) {
    return (
      <EmptyState
        title="No target locations yet"
        description="Geographic distribution appears from locations on your saved campaigns."
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-navy/[0.06] bg-gradient-to-br from-sky-50/80 via-white to-paper">
        <svg viewBox="0 0 100 100" className="h-44 w-full" role="img" aria-label="Campaign target areas schematic">
          <rect width="100" height="100" fill="transparent" />
          <path
            d="M20 35 Q35 15 55 22 T85 40 Q90 60 75 78 T45 92 Q25 88 18 65 Z"
            fill="#e0f2fe"
            stroke="#93c5fd"
            strokeWidth="0.6"
          />
          {locations.map((row) => {
            const pos = AREA_LAYOUT[row.area] ?? { x: 30 + (row.area.length % 5) * 10, y: 40 + (row.area.length % 7) * 6 }
            return (
              <g key={row.area}>
                <circle cx={pos.x} cy={pos.y} r="3.2" fill="#2563eb" opacity="0.9" />
                <title>{`${row.area}: ${row.autos} planned autos (${row.campaigns} campaigns)`}</title>
              </g>
            )
          })}
        </svg>
        <p className="absolute bottom-2 left-3 text-[10px] font-medium text-muted">Schematic map · not live GPS</p>
      </div>
      <ul className="max-h-32 space-y-1.5 overflow-y-auto text-sm">
        {locations.map((row) => (
          <li key={row.area} className="flex items-center justify-between gap-2">
            <span className="truncate font-medium text-navy">{row.area}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {formatNumber(row.autos)} autos · {row.campaigns} campaign{row.campaigns === 1 ? '' : 's'}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        Target areas from saved campaigns in {city}. Does not show live device locations.
      </p>
    </div>
  )
}

function PlannedCampaignActivityChart({ bars }: { bars: { day: string; value: number }[] }) {
  const total = bars.reduce((sum, row) => sum + row.value, 0)
  if (total === 0) {
    return (
      <EmptyState
        title="No planned activity yet"
        description="Bars count campaign-days by weekday from saved start and end dates."
      />
    )
  }

  const width = 360
  const height = 168
  const pad = { l: 8, r: 8, t: 8, b: 26 }
  const max = Math.max(...bars.map((b) => b.value), 1)
  const slot = (width - pad.l - pad.r) / bars.length
  const barW = Math.min(32, slot * 0.58)

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <p className="text-2xl font-bold tabular-nums text-navy">{formatNumber(total)}</p>
        <p className="text-xs text-muted">total campaign-days in saved schedules</p>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[10.5rem] w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Planned campaign activity by weekday"
      >
        {bars.map((row, index) => {
          const x = pad.l + index * slot + (slot - barW) / 2
          const h = Math.max(6, (row.value / max) * (height - pad.t - pad.b))
          const y = height - pad.b - h
          return (
            <g key={row.day}>
              <rect x={x} y={y} width={barW} height={h} rx="5" fill="#93c5fd">
                <title>{`${row.day}: ${row.value} campaign-day${row.value === 1 ? '' : 's'}`}</title>
              </rect>
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" fill="#64748b" fontSize="10">
                {row.day}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
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

export function DashboardPage() {
  const { account, profile, updateProfile } = useAdvertiser()
  const { data, loading, error, connectionNotice, apiConnected, reload } = useWorkspace()
  const advertiserKey = profile.contactEmail || account.companyName || account.fullName
  const [sampleNote, setSampleNote] = useState<string | null>(null)
  const [range, setRange] = useState<DashboardRange>({ preset: '30d', from: '', to: '' })
  const metrics = useMemo(
    () => buildDashboardMetrics(data, account.companyName),
    [data, account.companyName],
  )
  const sampleLoaded = !apiConnected && hasSampleAdvertiserData(advertiserKey)
  const showOfflineSampleTools = !apiConnected && !isApiConfigured()

  const recentCampaigns = useMemo(() => {
    return [...metrics.campaigns].sort((a, b) =>
      String(b.startDate || '').localeCompare(String(a.startDate || '')),
    )
  }, [metrics.campaigns])

  const budgetSeries = useMemo(
    () => buildBudgetCalendarSeries(metrics.campaigns, range),
    [metrics.campaigns, range],
  )
  const locationTargets = useMemo(() => aggregateLocationTargets(metrics.campaigns), [metrics.campaigns])
  const weekdayActivity = useMemo(() => buildWeekdayActivityBars(metrics.campaigns), [metrics.campaigns])

  const playbackTrend = useMemo(() => {
    if (metrics.trend.length === 0) return [] as PerformancePoint[]
    return filterTrend(metrics.trend, range)
  }, [metrics.trend, range])

  function loadSampleData() {
    updateProfile({
      ...profile,
      legalName: SAMPLE_COMPANY.legalName,
      tradeName: SAMPLE_COMPANY.tradeName,
      contactEmail: SAMPLE_COMPANY.contactEmail,
      contactName: SAMPLE_COMPANY.contactName,
      city: SAMPLE_COMPANY.city,
      businessType: SAMPLE_COMPANY.businessType,
      industry: SAMPLE_COMPANY.industry,
    })
    const key = SAMPLE_COMPANY.contactEmail
    const result = seedNammaFoodsSampleData(key)
    setSampleNote(
      result.created
        ? `Loaded ${result.campaignCount} [TEST] campaigns for ${SAMPLE_COMPANY.legalName}. Weekend budget ₹${result.weekendBudgetInr?.toLocaleString('en-IN')} (${TEST_PRICING.label}). Metrics below use this demo data only.`
        : result.reason,
    )
    window.setTimeout(() => reload(), 50)
  }

  const kpis: Kpi[] = [
    {
      label: 'Total Campaigns',
      value: metrics.totalCampaigns,
      to: '/campaigns',
      format: 'number',
      icon: <IconCampaigns className="h-5 w-5" />,
      iconWrap: 'bg-sky-50 text-sky-700',
    },
    {
      label: 'Active Campaigns',
      value: metrics.liveCampaigns,
      to: '/campaigns?status=Live',
      format: 'number',
      icon: <IconPulse className="h-5 w-5" />,
      iconWrap: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Scheduled Campaigns',
      value: metrics.scheduledCampaigns,
      to: '/campaigns?status=Scheduled',
      format: 'number',
      icon: <IconCalendar className="h-5 w-5" />,
      iconWrap: 'bg-sky-50 text-sky-700',
    },
    {
      label: 'Allocated Auto-Rickshaws',
      value: metrics.allocatedAutos,
      to: '/campaigns',
      format: 'number',
      icon: <IconScreen className="h-5 w-5" />,
      iconWrap: 'bg-indigo-50 text-indigo-700',
    },
    {
      label: 'Campaign Spend',
      value: metrics.amountSpent,
      to: '/billing',
      format: 'inr',
      icon: <IconSpend className="h-5 w-5" />,
      iconWrap: 'bg-violet-50 text-violet-700',
    },
    {
      label: 'Draft Campaigns',
      value: metrics.draftCampaigns,
      to: '/campaigns?status=Draft',
      format: 'number',
      icon: <IconClock className="h-5 w-5" />,
      iconWrap: 'bg-stone-100 text-stone-700',
    },
  ]

  if (loading) {
    return (
      <main className="mx-auto max-w-[88rem] animate-fade-in-up px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <DashboardSkeleton />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[88rem] animate-fade-in-up space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-[1.65rem]">Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            Track your campaign performance and manage your advertising campaigns.
            {apiConnected ? (
              <span className="mt-1 block font-medium text-teal">
                Connected to AutoAds API · company workspace from Postgres
              </span>
            ) : sampleLoaded ? (
              <span className="mt-1 block font-medium text-amber-800">
                Offline [TEST] browser data — not a live company account
              </span>
            ) : null}
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          <p className="font-semibold">Could not load workspace data</p>
          <p className="mt-1">{error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={reload}>
            Retry
          </Button>
        </div>
      ) : null}

      {connectionNotice ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <p>{connectionNotice}</p>
          {isApiConfigured() ? (
            <ButtonLink to="/settings" variant="secondary" size="sm" className="mt-3">
              Sign in (Settings → Security)
            </ButtonLink>
          ) : null}
        </div>
      ) : null}

      <Callout variant="measurement">
        {apiConnected
          ? 'Campaign counts and budgets come from your company database records. Proof of Play, GPS, and verified audience reach appear only when those telemetry services report data — empty means unavailable, not zero success.'
          : 'Sign in to NestJS to load real company data. Browser [TEST] samples are for offline UI checks only and are hidden once you are authenticated.'}
      </Callout>

      {showOfflineSampleTools && !sampleLoaded ? (
        <Card padding="sm" className="!p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-navy">Offline UI sample (optional)</p>
              <p className="mt-1 text-sm text-muted">
                Adds labelled [TEST] campaigns in this browser only. Prefer API sign-in for a manager demo.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={loadSampleData}>
              Load Namma Foods sample
            </Button>
          </div>
          {sampleNote ? <p className="mt-3 text-sm text-teal">{sampleNote}</p> : null}
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            to={kpi.to}
            className="group flex items-center gap-4 rounded-2xl border border-navy/[0.06] bg-card p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-navy/12 hover:shadow-md"
          >
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${kpi.iconWrap} transition group-hover:scale-105`}
              aria-hidden
            >
              {kpi.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted">{kpi.label}</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-navy">
                {kpi.format === 'inr' ? formatInr(kpi.value) : <CountUp value={kpi.value} format={formatNumber} />}
              </p>
            </div>
          </Link>
        ))}
      </section>

      <Card padding="md">
        <CardHeader
          title="Campaign Performance"
          description={
            playbackTrend.length > 0
              ? 'Validated playback trend from connected reports (filtered by date range).'
              : 'Daily committed budget from saved campaign dates — not device playback.'
          }
          action={
            <ButtonLink to="/analytics" variant="ghost" size="sm">
              Performance &amp; Reports
            </ButtonLink>
          }
        />
        <div className="-mb-1 [&_svg]:mx-auto [&_svg]:block [&_svg]:max-h-[12.5rem] [&_svg]:w-full">
          {playbackTrend.length > 0 ? (
            <PlaysOverTimeChart points={playbackTrend} />
          ) : (
            <CampaignCommitmentLineChart points={budgetSeries} />
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="md">
          <CardHeader
            title="Campaign Distribution"
            description="Target locations from saved campaigns"
            action={<IconMapPin className="text-muted" aria-hidden />}
          />
          <CampaignDistributionPanel locations={locationTargets} city={account.city || 'Bengaluru'} />
        </Card>

        <Card padding="md">
          <CardHeader
            title="Planned Campaign Activity"
            description="Campaign-days by weekday from saved start/end dates — not device running hours or telemetry"
          />
          <PlannedCampaignActivityChart bars={weekdayActivity} />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_min(20rem,28%)] xl:items-start">
        <Card padding="md" className="min-w-0">
          <CardHeader
            title="Recent Campaigns"
            description="Campaigns in your advertiser workspace"
            action={
              <ButtonLink to="/campaigns" variant="ghost" size="sm" className="shrink-0 whitespace-nowrap">
                View all →
              </ButtonLink>
            }
          />
          {recentCampaigns.length === 0 ? (
            <EmptyState
              title="No campaigns yet"
              description="Create a campaign or load the Namma Foods [TEST] sample to preview this table."
              action={
                <ButtonLink to="/campaigns/create" size="sm">
                  Create campaign
                </ButtonLink>
              }
            />
          ) : (
            <>
              <ul className="space-y-3 lg:hidden">
                {recentCampaigns.slice(0, 6).map((campaign) => (
                  <li
                    key={campaign.id}
                    className="rounded-xl border border-navy/[0.06] bg-paper/40 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br ${thumbClass(campaign.name)}`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/campaigns/${campaign.id}`}
                          className="font-semibold text-navy hover:text-teal"
                        >
                          {campaign.name}
                        </Link>
                        <p className="mt-1 text-xs text-muted">{formatShortRange(campaign.startDate, campaign.endDate)}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">{campaign.locations.join(', ') || '—'}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={campaignStatusClass(campaign.status)}>{campaign.status}</span>
                          <span className="text-xs tabular-nums text-muted">
                            {formatNumber(campaign.allocatedAutos || campaign.requestedAutos || 0)} autos ·{' '}
                            {campaign.budgetInr ? formatInr(campaign.budgetInr) : '—'}
                          </span>
                        </div>
                        <ButtonLink to={`/campaigns/${campaign.id}`} variant="secondary" size="sm" className="mt-2">
                          View
                        </ButtonLink>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden lg:block">
                <table className="w-full table-fixed text-left text-[13px]">
                  <thead className="border-b border-navy/[0.08] text-[10px] font-semibold uppercase tracking-wide text-muted">
                    <tr>
                      <th className="w-[26%] py-2 pr-2">Campaign</th>
                      <th className="w-[15%] py-2 pr-2">Duration</th>
                      <th className="w-[17%] py-2 pr-2">Locations</th>
                      <th className="w-[7%] py-2 pr-2">Autos</th>
                      <th className="w-[11%] py-2 pr-2">Budget</th>
                      <th className="w-[9%] py-2 pr-2">Status</th>
                      <th className="w-[10%] py-2 pr-2">Approval</th>
                      <th className="w-[5%] py-2"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy/[0.06]">
                    {recentCampaigns.slice(0, 8).map((campaign) => {
                      const approval =
                        campaign.approvalStatus || (campaign.status === 'Draft' ? 'Draft' : 'Approved')
                      return (
                        <tr key={campaign.id} className="align-middle">
                          <td className="py-2.5 pr-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex h-8 w-8 shrink-0 rounded-md bg-gradient-to-br ${thumbClass(campaign.name)}`}
                                aria-hidden
                              />
                              <Link
                                to={`/campaigns/${campaign.id}`}
                                title={`${campaign.name} (${campaign.id})`}
                                className="line-clamp-2 font-semibold leading-snug text-navy hover:text-teal"
                              >
                                {campaign.name}
                              </Link>
                            </div>
                          </td>
                          <td className="py-2.5 pr-2 text-xs leading-snug text-muted">
                            {formatShortRange(campaign.startDate, campaign.endDate)}
                          </td>
                          <td
                            className="truncate py-2.5 pr-2 text-xs text-muted"
                            title={campaign.locations.join(', ')}
                          >
                            {campaign.locations.join(', ') || '—'}
                          </td>
                          <td className="py-2.5 pr-2 tabular-nums text-navy">
                            {formatNumber(campaign.allocatedAutos || campaign.requestedAutos || 0)}
                          </td>
                          <td className="py-2.5 pr-2 tabular-nums text-navy">
                            {campaign.budgetInr ? formatCompactInr(campaign.budgetInr) : '—'}
                          </td>
                          <td className="py-2.5 pr-2">
                            <span className={`${campaignStatusClass(campaign.status)} !px-2 !py-0.5 !text-[10px]`}>
                              {campaign.status}
                            </span>
                          </td>
                          <td className="py-2.5 pr-2">
                            <span
                              className={`inline-flex max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200`}
                              title={approval}
                            >
                              {approval}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <ButtonLink
                              to={`/campaigns/${campaign.id}`}
                              variant="ghost"
                              size="sm"
                              className="!px-2 !text-xs"
                            >
                              View
                            </ButtonLink>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>

        <Card padding="md" className="min-w-0 xl:sticky xl:top-24">
          <CardHeader title="Action Required" description="Items that need your attention" />
          {metrics.attention.length === 0 ? (
            <p className="py-3 text-sm text-muted">You&apos;re all caught up — nothing needs action right now.</p>
          ) : (
            <ul className="space-y-2.5">
              {metrics.attention.slice(0, 4).map((item) => (
                <li key={item.id} className="rounded-xl border border-navy/[0.06] bg-paper/50 p-3">
                  <p className="text-sm font-semibold leading-snug text-navy">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{item.body}</p>
                  <ButtonLink to={item.to} variant="ghost" size="sm" className="mt-1.5 h-auto px-0 py-0 text-xs">
                    {item.action} →
                  </ButtonLink>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  )
}
