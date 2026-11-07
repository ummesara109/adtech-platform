import type { PerformancePoint } from '../../types/advertiser'
import { formatInr, formatNumber } from '../../lib/format'
import { EmptyState } from '../ui/EmptyState'

type PlaysChartProps = {
  points: PerformancePoint[]
}

export function PlaysOverTimeChart({ points }: PlaysChartProps) {
  if (points.length === 0) {
    return (
      <EmptyState
        title="No playback trend"
        description="Validated play logs will appear here once live campaigns start reporting."
      />
    )
  }

  const width = 560
  const height = 188
  const pad = { l: 36, r: 16, t: 16, b: 28 }
  const max = Math.max(...points.map((point) => Math.max(point.playbackStarts, point.completedPlays)), 1)
  const innerW = width - pad.l - pad.r
  const innerH = height - pad.t - pad.b
  const toX = (index: number) => pad.l + (index * innerW) / Math.max(points.length - 1, 1)
  const toY = (value: number) => pad.t + innerH - (value / max) * innerH
  const completedArea = `${points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(point.completedPlays)}`)
    .join(' ')} L ${toX(points.length - 1)} ${pad.t + innerH} L ${toX(0)} ${pad.t + innerH} Z`
  const startsPath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(point.playbackStarts)}`)
    .join(' ')
  const completedPath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(point.completedPlays)}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" role="img" aria-label="Advertisement plays over time">
      <defs>
        <linearGradient id="dashCompletedFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d9488" stopOpacity="0.22" />
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
      <path d={completedArea} fill="url(#dashCompletedFill)" />
      <path d={startsPath} fill="none" stroke="#0a1a32" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d={completedPath} fill="none" stroke="#0d9488" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => (
        <g key={point.date}>
          <circle cx={toX(index)} cy={toY(point.completedPlays)} r="3" fill="#0d9488" />
          <text x={toX(index)} y={height - 8} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="500">
            {point.date}
          </text>
        </g>
      ))}
    </svg>
  )
}

type SpendPoint = { id: string; label: string; amount: number; paid: boolean }

export function SpendTrendChart({ points }: { points: SpendPoint[] }) {
  if (points.length === 0) {
    return (
      <EmptyState
        title="No spending recorded"
        description="Invoice amounts will plot here after payments are issued."
      />
    )
  }

  const width = 560
  const height = 188
  const pad = { l: 16, r: 16, t: 16, b: 28 }
  const max = Math.max(...points.map((point) => point.amount), 1)
  const slot = (width - pad.l - pad.r) / points.length
  const barW = Math.min(40, slot * 0.45)

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" role="img" aria-label="Campaign spending trends">
        {points.map((point, index) => {
          const x = pad.l + index * slot + (slot - barW) / 2
          const h = Math.max(4, ((point.amount / max) * (height - pad.t - pad.b)) | 0)
          const y = height - pad.b - h
          const short = point.label.replace(/ 2026/, '')
          return (
            <g key={point.id}>
              <rect x={x} y={y} width={barW} height={h} rx="6" fill={point.paid ? '#0a1a32' : '#f0b429'}>
                <title>{`${point.id}: ${formatInr(point.amount)} · ${point.paid ? 'Paid' : 'Pending'}`}</title>
              </rect>
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" fill="#64748b" fontSize="10">
                {short}
              </text>
            </g>
          )
        })}
      </svg>
      <ul className="mt-1 flex justify-center gap-4 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-navy" /> Paid
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-auto" /> Pending
        </li>
      </ul>
    </div>
  )
}

type DeliveryRow = { id: string; name: string; completed: number; starts: number; rate: number }

export function DeliveryPerformanceChart({ rows }: { rows: DeliveryRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No delivery reports"
        description="Campaign completion rates appear after validated playback is logged."
      />
    )
  }

  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.id}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-navy">{row.name}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {row.rate}% · {formatNumber(row.completed)}/{formatNumber(row.starts)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-navy/[0.06]">
            <div
              className="h-full rounded-full bg-teal transition-all duration-500"
              style={{ width: `${Math.min(100, row.rate)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function BudgetUtilizationBar({ percent, spentLabel, allocatedLabel }: { percent: number; spentLabel: string; allocatedLabel: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-navy">Budget utilization</span>
        <span className="tabular-nums text-muted">{percent}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-navy/[0.06]">
        <div
          className="h-full rounded-full bg-auto transition-all duration-500"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        {spentLabel} spent of {allocatedLabel} allocated
      </p>
    </div>
  )
}

type StatusSlice = { status: string; count: number; color: string }

export function CampaignStatusDoughnut({ slices }: { slices: StatusSlice[] }) {
  const total = slices.reduce((sum, row) => sum + row.count, 0)
  if (total === 0) {
    return (
      <EmptyState
        title="No campaign status data"
        description="A doughnut chart appears when you have campaigns in your workspace."
      />
    )
  }

  const size = 168
  const stroke = 22
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label="Campaign status">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#0a1a320d" strokeWidth={stroke} />
        {slices
          .filter((row) => row.count > 0)
          .map((row) => {
            const length = (row.count / total) * circumference
            const circle = (
              <circle
                key={row.status}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={row.color}
                strokeWidth={stroke}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            )
            offset += length
            return circle
          })}
        <text x="50%" y="48%" textAnchor="middle" className="fill-navy" fontSize="22" fontWeight="700">
          {total}
        </text>
        <text x="50%" y="60%" textAnchor="middle" className="fill-slate-500" fontSize="10" fontWeight="600">
          campaigns
        </text>
      </svg>
      <ul className="w-full space-y-2 text-sm">
        {slices
          .filter((row) => row.count > 0)
          .map((row) => (
            <li key={row.status} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-navy">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} aria-hidden />
                {row.status}
              </span>
              <span className="tabular-nums font-semibold text-muted">{row.count}</span>
            </li>
          ))}
      </ul>
    </div>
  )
}

export function SuccessfulFailedPlaysChart({
  successful,
  failed,
}: {
  successful: number
  failed: number
}) {
  const max = Math.max(successful, failed, 1)
  if (successful === 0 && failed === 0) {
    return (
      <EmptyState
        title="No playback results yet"
        description="Successful and failed plays appear from Proof of Play records."
      />
    )
  }

  return (
    <div className="space-y-4">
      {[
        { label: 'Successful plays', value: successful, color: '#0d9488' },
        { label: 'Failed plays', value: failed, color: '#e11d48' },
      ].map((row) => (
        <div key={row.label}>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="font-medium text-navy">{row.label}</span>
            <span className="tabular-nums text-muted">{formatNumber(row.value)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-navy/[0.06]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(row.value / max) * 100}%`, background: row.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
