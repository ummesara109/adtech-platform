import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-navy/15 bg-paper/60 px-5 py-10 text-center">
      <p className="font-semibold text-navy">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
