import { useEffect, useRef, useState } from 'react'
import { IconCalendar, IconChevron } from './DashboardIcons'
import type { DashboardRange, DashboardRangePreset } from '../../lib/dashboardMetrics'

const PRESETS: { id: DashboardRangePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' },
  { id: 'all', label: 'All time' },
]

type Props = {
  value: DashboardRange
  onChange: (range: DashboardRange) => void
}

function labelForPreset(preset: DashboardRangePreset) {
  return PRESETS.find((row) => row.id === preset)?.label ?? 'Custom range'
}

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-navy/10 bg-white px-3 py-2 text-sm font-medium text-navy shadow-sm transition hover:border-primary/30 hover:shadow"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <IconCalendar className="text-muted" />
        {labelForPreset(value.preset)}
        <IconChevron className="text-muted" />
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 z-30 mt-2 min-w-[11rem] overflow-hidden rounded-xl border border-navy/10 bg-white py-1 shadow-[var(--shadow-elevated)]"
        >
          {PRESETS.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                role="option"
                aria-selected={value.preset === preset.id}
                className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-paper ${
                  value.preset === preset.id ? 'font-semibold text-primary' : 'text-navy'
                }`}
                onClick={() => {
                  onChange({ preset: preset.id, from: '', to: '' })
                  setOpen(false)
                }}
              >
                {preset.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
