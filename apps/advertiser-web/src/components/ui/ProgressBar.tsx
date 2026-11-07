type ProgressBarProps = {
  value: number
  max: number
  label?: string
  sublabel?: string
}

export function ProgressBar({ value, max, label, sublabel }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0

  return (
    <li>
      {(label || sublabel) && (
        <div className="mb-1.5 flex justify-between gap-2 text-sm">
          {label ? <span className="font-medium text-navy">{label}</span> : <span />}
          {sublabel ? <span className="text-muted">{sublabel}</span> : null}
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-navy/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal to-teal/70 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  )
}
