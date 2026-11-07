import type { ReactNode } from 'react'

type TableShellProps = {
  children: ReactNode
  minWidth?: string
}

export function TableShell({ children, minWidth = '720px' }: TableShellProps) {
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-navy/[0.06]">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  )
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-navy/[0.08] bg-paper/80 text-xs font-semibold uppercase tracking-wider text-muted">
      {children}
    </thead>
  )
}

export function Th({ children = null, className = '' }: { children?: ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-medium first:pl-5 last:pr-5 ${className}`}>{children}</th>
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <td className={`border-b border-navy/[0.04] px-4 py-3.5 first:pl-5 last:pr-5 ${className}`}>{children}</td>
  )
}
