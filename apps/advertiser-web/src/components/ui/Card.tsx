import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md'
}

const paddingClass = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-navy/[0.08] bg-card shadow-[var(--shadow-card)] ${paddingClass[padding]} ${className}`}
    >
      {children}
    </section>
  )
}

type CardHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-navy">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
