import type { ReactNode } from 'react'

type CalloutProps = {
  children: ReactNode
  variant?: 'info' | 'measurement'
}

export function Callout({ children, variant = 'info' }: CalloutProps) {
  const styles =
    variant === 'measurement'
      ? 'border-teal/20 bg-teal-muted/40 text-navy/80'
      : 'border-navy/10 bg-paper text-muted'

  return (
    <p className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${styles}`}>
      {variant === 'measurement' ? (
        <span className="mr-1.5 font-semibold text-teal">Note ·</span>
      ) : null}
      {children}
    </p>
  )
}
