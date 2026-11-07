import { apiRequest } from './httpClient'

export type ScreenAvailabilityStatus = 'available' | 'booked' | 'unavailable'

export type AvailabilityScreen = {
  id: string
  publicId: string
  autoId: string
  city: string
  locality: string
  latitude: number
  longitude: number
  label: string
  deviceStatus: 'Active' | 'Inactive' | 'Maintenance'
  availability: ScreenAvailabilityStatus
  blockedUntil: string | null
  holdExpiresAt: string | null
}

export type AvailabilityResponse = {
  city: string
  localities: string[]
  timezone: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  daysOfWeek: string[]
  windowCount: number
  summary: {
    total: number
    available: number
    booked: number
    unavailable: number
    selected: number
    remaining: number
  }
  availabilityVaries: boolean
  dateBreakdown: Array<{
    date: string
    total: number
    available: number
    booked: number
    unavailable: number
  }>
  screens: AvailabilityScreen[]
  note: string | null
}

export type InventoryLocality = {
  id: string
  city: string
  name: string
  centerLat: number | null
  centerLng: number | null
  registeredScreens: number
}

export type AvailabilityQuery = {
  city: string
  localities: string[]
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  timezone?: string
  daysOfWeek?: string[]
}

export function fetchLocalities(city: string) {
  return apiRequest<InventoryLocality[]>(
    `/api/v1/advertiser/inventory/localities?city=${encodeURIComponent(city)}`,
  )
}

export function queryAvailability(body: AvailabilityQuery) {
  return apiRequest<AvailabilityResponse>('/api/v1/advertiser/inventory/availability', {
    method: 'POST',
    body,
  })
}

export function createInventoryHolds(body: AvailabilityQuery & { screenIds: string[] }) {
  return apiRequest<{
    holdCount: number
    screenCount: number
    expiresAt: string
    ttlSeconds: number
    screenIds: string[]
  }>('/api/v1/advertiser/inventory/holds', {
    method: 'POST',
    body,
  })
}

export function validateInventorySelection(body: AvailabilityQuery & { screenIds: string[] }) {
  return apiRequest<{
    ok: boolean
    conflicts: Array<{ screenId: string; publicId: string; reason?: string; date?: string }>
    summary: AvailabilityResponse['summary']
    holdExpiresHintMinutes: number
  }>('/api/v1/advertiser/inventory/validate', {
    method: 'POST',
    body,
  })
}
