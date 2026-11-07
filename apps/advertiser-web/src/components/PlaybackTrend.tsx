import type { PerformancePoint } from '../types/advertiser'
import { ButtonLink } from './ui/Button'
import { Card, CardHeader } from './ui/Card'

type PlaybackTrendProps = {
  points: PerformancePoint[]
}

export function PlaybackTrend({ points }: PlaybackTrendProps) {
  const width = 560
  const height = 200
  const pad = 32
  const max = Math.max(...points.map((point) => Math.max(point.playbackStarts, point.completedPlays)), 1)

  const toX = (index: number) => pad + (index * (width - pad * 2)) / Math.max(points.length - 1, 1)
  const toY = (value: number) => height - pad - (value / max) * (height - pad * 2)

  const completedArea =
    points.length > 0
      ? `${points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(point.completedPlays)}`).join(' ')} L ${toX(points.length - 1)} ${height - pad} L ${toX(0)} ${height - pad} Z`
      : ''

  const startsPath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(point.playbackStarts)}`)
    .join(' ')
  const completedPath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(point.completedPlays)}`)
    .join(' ')

  const gridLines = [0.25, 0.5, 0.75].map((frac) => height - pad - frac * (height - pad * 2))

  return (
    <Card>
      <CardHeader
        title="Performance trend"
        description="Validated playback starts and completed plays (last 7 days)"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <ul className="flex gap-4 text-xs text-muted">
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-navy" /> Starts
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-teal" /> Completed
              </li>
            </ul>
            <ButtonLink to="/analytics" variant="outline" size="sm">
              Open live view
            </ButtonLink>
          </div>
        }
      />
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" role="img" aria-label="Playback trend">
        <defs>
          <linearGradient id="completedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((y) => (
          <line key={y} x1={pad} x2={width - pad} y1={y} y2={y} stroke="#0a1a32" strokeOpacity="0.06" />
        ))}
        {completedArea ? <path d={completedArea} fill="url(#completedFill)" /> : null}
        <path d={startsPath} fill="none" stroke="#0a1a32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={completedPath} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={point.date}>
            <circle cx={toX(index)} cy={toY(point.completedPlays)} r="3.5" fill="#0d9488" />
            <text x={toX(index)} y={height - 10} textAnchor="middle" className="fill-muted" fontSize="10" fontWeight="500">
              {point.date}
            </text>
          </g>
        ))}
      </svg>
    </Card>
  )
}
