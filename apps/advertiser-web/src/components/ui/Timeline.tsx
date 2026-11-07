import type { ReactNode } from 'react'

export type TimelineItem = {
  id: string
  title: string
  meta?: ReactNode
  badge?: ReactNode
  body?: string
}

type TimelineProps = {
  items: TimelineItem[]
}

export function Timeline({ items }: TimelineProps) {
  return (
    <ol className="relative space-y-0">
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
          {index < items.length - 1 ? (
            <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-navy/10" aria-hidden />
          ) : null}
          <span
            className="relative z-[1] mt-1.5 h-[22px] w-[22px] shrink-0 rounded-full border-2 border-auto bg-card shadow-sm"
            aria-hidden
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              {item.badge}
              {item.meta}
            </div>
            <p className="mt-1 text-sm font-semibold text-navy">{item.title}</p>
            {item.body ? <p className="mt-0.5 text-sm leading-relaxed text-muted">{item.body}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
