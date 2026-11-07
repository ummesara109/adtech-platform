import type { ReactNode } from 'react'

export function PhoneFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div className="module-title">{title}</div>
      <div className="phone-frame">
        <div className="phone-notch" />
        <div className="phone-screen pt-5">{children}</div>
      </div>
    </div>
  )
}
