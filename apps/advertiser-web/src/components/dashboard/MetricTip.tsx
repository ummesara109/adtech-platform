import type { ReactNode } from 'react'

export function MetricTip({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <span className="group/tip relative inline-flex items-center gap-1">
      {children}
      <span
        tabIndex={0}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-navy/8 text-[10px] font-bold text-muted transition hover:bg-navy/15 hover:text-navy"
        aria-label={text}
      >
        i
      </span>
      <span
        role="tooltip"
        aria-hidden="true"
        className="pointer-events-none invisible absolute bottom-[calc(100%+8px)] left-1/2 z-30 w-56 -translate-x-1/2 rounded-lg bg-navy px-3 py-2 text-left text-xs font-medium leading-relaxed text-white opacity-0 shadow-[var(--shadow-elevated)] transition group-hover/tip:visible group-hover/tip:opacity-100 group-focus-within/tip:visible group-focus-within/tip:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
