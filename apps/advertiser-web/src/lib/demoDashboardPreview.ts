import type { PerformancePoint } from '../types/advertiser'
import type { DashboardRange } from './dashboardMetrics'
import { filterTrend } from './dashboardMetrics'

/** All metrics below are illustrative demo data for frontend preview — not live platform results. */
export const DEMO_DATA_LABEL = 'Demo preview data — not live playback or billing'

export const DEMO_COMPANIES = [
  { id: 'acme', name: 'Acme Brands Pvt Ltd' },
  { id: 'namma', name: 'Namma Foods Pvt Ltd' },
] as const

export const DEMO_USER = {
  fullName: 'Rohit Kumar',
  initials: 'RK',
}

export type DemoKpi = {
  id: string
  label: string
  value: string
  trend: string
  trendUp: boolean
  icon: 'devices' | 'campaigns' | 'starts' | 'completed' | 'rate' | 'spend'
  accent: string
}

export const DEMO_KPIS: DemoKpi[] = [
  {
    id: 'targeted-devices',
    label: 'Total Targeted Devices',
    value: '2,480',
    trend: '+12%',
    trendUp: true,
    icon: 'devices',
    accent: 'bg-sky-50 text-sky-600',
  },
  {
    id: 'active-campaigns',
    label: 'Active Campaigns',
    value: '3',
    trend: '+1',
    trendUp: true,
    icon: 'campaigns',
    accent: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 'playback-starts',
    label: 'Playback Starts',
    value: '1.2M',
    trend: '+18%',
    trendUp: true,
    icon: 'starts',
    accent: 'bg-violet-50 text-violet-600',
  },
  {
    id: 'completed-ads',
    label: 'Completed Ads',
    value: '1.1M',
    trend: '+20%',
    trendUp: true,
    icon: 'completed',
    accent: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 'completion-rate',
    label: 'Playback Completion Rate',
    value: '94.2%',
    trend: '+1.1%',
    trendUp: true,
    icon: 'rate',
    accent: 'bg-teal-50 text-teal-600',
  },
  {
    id: 'expenditure',
    label: 'Campaign Expenditure',
    value: '₹1.8L',
    trend: '+15%',
    trendUp: true,
    icon: 'spend',
    accent: 'bg-violet-50 text-violet-600',
  },
]

/** Advertiser analytics fields from architecture doc §8 (demo values). */
export const DEMO_ANALYTICS_DOC = {
  totalTargetedDevices: 2480,
  activeDevices: 2310,
  playbackStarts: 1_200_000,
  completedAdvertisements: 1_100_000,
  interruptedAdvertisements: 68_400,
  playbackCompletionRate: 94.2,
  campaignRunningHours: 320,
  campaignExpenditureInr: 180_000,
}

const APR_PERFORMANCE: PerformancePoint[] = [
  { date: 'Apr 1', playbackStarts: 32000, completedPlays: 29800 },
  { date: 'Apr 5', playbackStarts: 38000, completedPlays: 35500 },
  { date: 'Apr 10', playbackStarts: 42000, completedPlays: 39200 },
  { date: 'Apr 15', playbackStarts: 51000, completedPlays: 47800 },
  { date: 'Apr 20', playbackStarts: 47000, completedPlays: 44100 },
  { date: 'Apr 25', playbackStarts: 55000, completedPlays: 52000 },
  { date: 'Apr 30', playbackStarts: 58000, completedPlays: 54800 },
]

export function demoPerformanceForRange(range: DashboardRange): PerformancePoint[] {
  const filtered = filterTrend(APR_PERFORMANCE, range)
  return filtered.length > 0 ? filtered : APR_PERFORMANCE
}

export type DemoMapPin = { lat: number; lng: number; label: string }

export const DEMO_MAP_PINS: DemoMapPin[] = [
  { lat: 12.9716, lng: 77.5946, label: 'Central Bengaluru' },
  { lat: 12.9698, lng: 77.75, label: 'Whitefield' },
  { lat: 12.9352, lng: 77.6245, label: 'Koramangala' },
  { lat: 13.0358, lng: 77.597, label: 'Hebbal' },
  { lat: 12.9141, lng: 77.6101, label: 'BTM' },
  { lat: 12.9279, lng: 77.6271, label: 'HSR Layout' },
]

export type DemoRunningHourBar = { day: string; hours: number }

export const DEMO_RUNNING_HOURS: DemoRunningHourBar[] = [
  { day: 'Mon', hours: 38 },
  { day: 'Tue', hours: 42 },
  { day: 'Wed', hours: 45 },
  { day: 'Thu', hours: 41 },
  { day: 'Fri', hours: 48 },
  { day: 'Sat', hours: 52 },
  { day: 'Sun', hours: 54 },
]

export type DemoRecentCampaign = {
  id: string
  name: string
  thumbGradient: string
  duration: string
  locations: string
  autos: number
  budgetInr: number
  status: 'Active' | 'Scheduled' | 'Completed'
  approval: 'Approved' | 'Pending' | 'Under Review'
}

export const DEMO_RECENT_CAMPAIGNS: DemoRecentCampaign[] = [
  {
    id: 'demo-summer',
    name: 'Summer Sale 2026',
    thumbGradient: 'from-orange-400 to-rose-500',
    duration: '1 Apr – 30 Apr 2026',
    locations: 'Bengaluru — Koramangala, HSR',
    autos: 850,
    budgetInr: 72000,
    status: 'Active',
    approval: 'Approved',
  },
  {
    id: 'demo-launch',
    name: 'New Launch Offer',
    thumbGradient: 'from-sky-400 to-indigo-500',
    duration: '15 May – 15 Jun 2026',
    locations: 'Bengaluru — Whitefield',
    autos: 620,
    budgetInr: 54000,
    status: 'Scheduled',
    approval: 'Approved',
  },
  {
    id: 'demo-festival',
    name: 'Festival Discounts',
    thumbGradient: 'from-violet-400 to-purple-600',
    duration: '1 Mar – 31 Mar 2026',
    locations: 'Bengaluru — Hebbal, Yelahanka',
    autos: 480,
    budgetInr: 38000,
    status: 'Completed',
    approval: 'Approved',
  },
]

export const DEMO_NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'Campaign approved',
    body: 'Summer Sale 2026 is approved and scheduled to go live.',
    at: '2 hours ago',
    read: false,
  },
  {
    id: 'n2',
    title: 'Playback report ready',
    body: 'March playback summary is available under Performance & Reports.',
    at: 'Yesterday',
    read: false,
  },
  {
    id: 'n3',
    title: 'Invoice issued',
    body: 'Invoice INV-2026-0142 for ₹42,000 is ready in Invoices & Payments.',
    at: '3 days ago',
    read: true,
  },
]
