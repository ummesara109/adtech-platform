import { useEffect, useState } from 'react'

type CountUpProps = {
  value: number
  durationMs?: number
  className?: string
  format?: (value: number) => string
}

export function CountUp({ value, durationMs = 700, className, format = (n) => String(n) }: CountUpProps) {
  const [display, setDisplay] = useState(0)
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (reduceMotion || value === 0) {
      setDisplay(value)
      return
    }
    let frame = 0
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - progress) ** 3
      setDisplay(Math.round(from + (value - from) * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, durationMs, reduceMotion])

  return <span className={className}>{format(display)}</span>
}
