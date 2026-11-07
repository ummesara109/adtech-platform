import type { ReactNode } from 'react'

type PageLayoutProps = {
  children: ReactNode
  className?: string
}

export function PageLayout({ children, className = '' }: PageLayoutProps) {
  return (
    <main className={`mx-auto max-w-7xl animate-fade-in-up space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 ${className}`}>
      {children}
    </main>
  )
}
