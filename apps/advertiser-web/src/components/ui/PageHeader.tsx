import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type PageHeaderProps = {
  title: string
  description?: string
  backTo?: { label: string; href: string }
  actions?: ReactNode
}

export function PageHeader({ title, description, backTo, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {backTo ? (
          <Link
            to={backTo.href}
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-teal transition hover:text-teal/80"
          >
            <span aria-hidden>←</span> {backTo.label}
          </Link>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}
