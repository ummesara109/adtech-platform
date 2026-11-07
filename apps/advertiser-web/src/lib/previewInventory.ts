/**
 * Frontend preview inventory catalog for Create Campaign UX.
 * This is NOT a live booking system — counts are for interactive preview only.
 */

export type PreviewAvailability = 'available' | 'booked' | 'unavailable'

export type PreviewLocality = {
  city: string
  name: string
  centerLat: number
  centerLng: number
  registered: number
}

export type PreviewScreen = {
  id: string
  publicId: string
  autoId: string
  city: string
  locality: string
  latitude: number
  longitude: number
  label: string
  deviceStatus: 'Active' | 'Inactive' | 'Maintenance'
  availability: PreviewAvailability
}

export type PreviewAvailabilityResult = {
  summary: {
    total: number
    available: number
    booked: number
    unavailable: number
  }
  screens: PreviewScreen[]
  previewNote: string
}

export const PREVIEW_NOTE =
  'Development preview inventory — available counts let you pick within a limit while testing. Not live fleet booking; NestJS inventory replaces this when connected.'

/** Demo catalog capacities for advertiser testing (not live device telemetry). */
export const PREVIEW_LOCALITIES: PreviewLocality[] = [
  { city: 'Bengaluru', name: 'Whitefield', centerLat: 12.9698, centerLng: 77.75, registered: 650 },
  { city: 'Bengaluru', name: 'Marathahalli', centerLat: 12.9591, centerLng: 77.6974, registered: 420 },
  { city: 'Bengaluru', name: 'Electronic City', centerLat: 12.8452, centerLng: 77.6602, registered: 380 },
  { city: 'Bengaluru', name: 'Koramangala', centerLat: 12.9352, centerLng: 77.6245, registered: 510 },
  { city: 'Bengaluru', name: 'Indiranagar', centerLat: 12.9784, centerLng: 77.6408, registered: 440 },
  { city: 'Bengaluru', name: 'HSR Layout', centerLat: 12.9116, centerLng: 77.6473, registered: 390 },
]

function hash(input: string) {
  let h = 0
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) >>> 0
  return h
}

function parseMinutes(hm: string) {
  const [h, m] = hm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

export type PreviewAreaCount = {
  locality: string
  totalRegistered: number
  available: number
  booked: number
  unavailable: number
}

/**
 * Fast area-level preview counts (no per-vehicle objects).
 * Booked/unavailable share updates when dates/hours change so the UI feels dynamic.
 */
export function computePreviewAreaCounts(input: {
  city: string
  localities: string[]
  startDate: string
  endDate: string
  startTime: string
  endTime: string
}): PreviewAreaCount[] {
  const localities = PREVIEW_LOCALITIES.filter(
    (row) => row.city === input.city && (!input.localities.length || input.localities.includes(row.name)),
  )
  const startMin = parseMinutes(input.startTime)
  const endMin = parseMinutes(input.endTime)

  return localities.map((locality) => {
    const totalRegistered = locality.registered
    const maintenanceSlice = Math.min(8, Math.max(2, Math.round(totalRegistered * 0.02)))
    let unavailable = maintenanceSlice
    let booked = 0
    if (startMin != null && endMin != null && input.startDate) {
      const windowHash = hash(
        `${locality.name}|${input.startDate}|${input.endDate}|${Math.floor((startMin ?? 0) / 120)}`,
      )
      const busyMorning = startMin < 11 * 60 && endMin > 9 * 60
      const bookedShare = busyMorning ? 0.18 + (windowHash % 7) / 100 : 0.08 + (windowHash % 5) / 100
      booked = Math.round((totalRegistered - unavailable) * bookedShare)
    }
    const available = Math.max(0, totalRegistered - unavailable - booked)
    return { locality: locality.name, totalRegistered, available, booked, unavailable }
  })
}

/** Build preview screens for map/list UIs (caps object count for performance). */
export function computePreviewAvailability(input: {
  city: string
  localities: string[]
  startDate: string
  endDate: string
  startTime: string
  endTime: string
}): PreviewAvailabilityResult {
  const areaCounts = computePreviewAreaCounts(input)
  const startMin = parseMinutes(input.startTime)
  const endMin = parseMinutes(input.endTime)
  const screens: PreviewScreen[] = []
  const SAMPLE_CAP = 24

  for (const area of areaCounts) {
    const localityMeta = PREVIEW_LOCALITIES.find((row) => row.name === area.locality)
    if (!localityMeta) continue
    const sample = Math.min(SAMPLE_CAP, area.totalRegistered)
    for (let i = 0; i < sample; i += 1) {
      const n = i + 1
      const id = `preview:${area.locality}:${n}`
      let availability: PreviewAvailability = 'available'
      if (i >= sample - Math.min(2, sample)) availability = 'unavailable'
      else if (startMin != null && endMin != null && input.startDate) {
        const slot = hash(`${id}|${input.startDate}|${input.endDate}|${Math.floor(startMin / 120)}`)
        const overlapsBusyMorning = startMin < 11 * 60 && endMin > 9 * 60
        if (overlapsBusyMorning && slot % 5 === 0) availability = 'booked'
        else if (slot % 11 === 0) availability = 'booked'
      }
      screens.push({
        id,
        publicId: `PREV-${area.locality.slice(0, 3).toUpperCase()}-${String(n).padStart(2, '0')}`,
        autoId: `AUTO-${area.locality.slice(0, 3).toUpperCase()}-${String(n).padStart(2, '0')}`,
        city: localityMeta.city,
        locality: area.locality,
        latitude: localityMeta.centerLat + (i % 4) * 0.0015 - 0.002,
        longitude: localityMeta.centerLng + Math.floor(i / 4) * 0.0018 - 0.002,
        label: `${area.locality} screen ${n}`,
        deviceStatus: availability === 'unavailable' ? 'Maintenance' : 'Active',
        availability,
      })
    }
  }

  const summary = areaCounts.reduce(
    (acc, row) => ({
      total: acc.total + row.totalRegistered,
      available: acc.available + row.available,
      booked: acc.booked + row.booked,
      unavailable: acc.unavailable + row.unavailable,
    }),
    { total: 0, available: 0, booked: 0, unavailable: 0 },
  )

  return {
    summary,
    screens,
    previewNote: PREVIEW_NOTE,
  }
}

/** Rough INR estimate for preview quote (not a live rate card). */
export function estimatePreviewPriceInr(selectedCount: number, dayCount: number, hoursPerDay: number) {
  if (selectedCount < 1 || dayCount < 1 || hoursPerDay <= 0) return 0
  const ratePerScreenHour = 85
  return Math.round(selectedCount * dayCount * hoursPerDay * ratePerScreenHour)
}
