/** Asia/Kolkata fixed offset used for Bengaluru inventory windows. */
export const DEFAULT_TZ = 'Asia/Kolkata'
export const IST_OFFSET_MINUTES = 330

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export type ScheduleWindow = { startAt: Date; endAt: Date; date: string }

export function parseHmToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

/** Convert a calendar date + HH:mm in IST to a UTC Date. */
export function istLocalToUtc(dateYmd: string, hm: string): Date {
  const [y, m, d] = dateYmd.split('-').map(Number)
  const mins = parseHmToMinutes(hm)
  if (!y || !m || !d || mins == null) throw new Error(`Invalid IST datetime ${dateYmd} ${hm}`)
  const hours = Math.floor(mins / 60)
  const minutes = mins % 60
  return new Date(Date.UTC(y, m - 1, d, hours, minutes, 0, 0) - IST_OFFSET_MINUTES * 60_000)
}

export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd
}

export function eachDateInclusive(startYmd: string, endYmd: string): string[] {
  const out: string[] = []
  const cursor = new Date(`${startYmd}T00:00:00Z`)
  const end = new Date(`${endYmd}T00:00:00Z`)
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || end < cursor) return out
  while (cursor <= end) {
    out.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return out
}

export function weekdayNameUtcDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  // Interpret Y-M-D as a civil date; weekday in IST ≈ use noon IST
  const noonIst = istLocalToUtc(ymd, '12:00')
  return WEEKDAY_NAMES[noonIst.getUTCDay()]
}

/**
 * Expand a multi-day campaign schedule into concrete UTC windows per selected weekday.
 */
export function expandScheduleWindows(input: {
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  daysOfWeek: string[]
}): ScheduleWindow[] {
  const startMin = parseHmToMinutes(input.startTime)
  const endMin = parseHmToMinutes(input.endTime)
  if (startMin == null || endMin == null || endMin <= startMin) return []

  const selected = new Set(input.daysOfWeek.map((d) => d.trim()))
  const dates = eachDateInclusive(input.startDate, input.endDate)
  const windows: ScheduleWindow[] = []

  for (const date of dates) {
    const dayName = weekdayNameUtcDate(date)
    if (selected.size > 0 && !selected.has(dayName)) continue
    windows.push({
      date,
      startAt: istLocalToUtc(date, input.startTime),
      endAt: istLocalToUtc(date, input.endTime),
    })
  }
  return windows
}

export function bookingBlocksWindow(booking: {
  startAt: Date
  endAt: Date
  status: string
  holdExpiresAt: Date | null
}, window: ScheduleWindow, now = new Date()) {
  if (booking.status === 'Cancelled' || booking.status === 'Expired') return false
  if (booking.status === 'Hold') {
    if (!booking.holdExpiresAt || booking.holdExpiresAt <= now) return false
  }
  if (booking.status !== 'Hold' && booking.status !== 'Reserved' && booking.status !== 'Confirmed') {
    return false
  }
  return intervalsOverlap(booking.startAt, booking.endAt, window.startAt, window.endAt)
}
