import { useEffect, useMemo, useState } from 'react'
import { queryAvailability, type AvailabilityResponse } from '../api/inventoryAvailability'
import { ApiError } from '../api/httpClient'
import { isApiConfigured } from '../lib/config'
import { loadAuthSession } from '../lib/authSession'
import { validateOperatingHours } from '../lib/operatingHours'
import {
  computePreviewAreaCounts,
  PREVIEW_LOCALITIES,
  PREVIEW_NOTE,
  type PreviewAreaCount,
} from '../lib/previewInventory'
import type { WeekDay } from '../types/campaignWizard'

export type AreaAvailabilityRow = {
  locality: string
  totalRegistered: number | null
  eligible: number | null
  available: number | null
  booked: number | null
  unavailable: number | null
  requested: number
  status: 'available' | 'limited' | 'unavailable' | 'unknown' | 'disconnected' | 'preview'
}

export type AvailabilityQueryInput = {
  city: string
  localities: string[]
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  daysOfWeek: WeekDay[]
  locationRequests: Record<string, number>
}

function rowFromCounts(
  locality: string,
  counts: PreviewAreaCount | undefined,
  requested: number,
  mode: 'live' | 'preview',
): AreaAvailabilityRow {
  if (!counts) {
    return {
      locality,
      totalRegistered: null,
      eligible: null,
      available: null,
      booked: null,
      unavailable: null,
      requested,
      status: 'unavailable',
    }
  }
  const { totalRegistered, available, booked, unavailable } = counts
  let status: AreaAvailabilityRow['status'] = mode === 'preview' ? 'preview' : 'available'
  if (available === 0) status = 'unavailable'
  else if (requested > available) status = 'limited'
  else if (mode === 'live') status = 'available'
  return {
    locality,
    totalRegistered,
    eligible: available + booked,
    available,
    booked,
    unavailable,
    requested,
    status,
  }
}

function catalogFallbackAreas(
  localities: string[],
  locationRequests: Record<string, number>,
): AreaAvailabilityRow[] {
  return localities.map((locality) => {
    const catalog = PREVIEW_LOCALITIES.find((row) => row.name === locality)
    const registered = catalog?.registered ?? 0
    const unavailable = Math.min(8, Math.max(2, Math.round(registered * 0.02)))
    const available = Math.max(0, registered - unavailable)
    const requested = locationRequests[locality] ?? 0
    return {
      locality,
      totalRegistered: registered || null,
      eligible: available || null,
      available: available || null,
      booked: 0,
      unavailable: registered ? unavailable : null,
      requested,
      status: (requested > available ? 'limited' : 'preview') as AreaAvailabilityRow['status'],
    }
  })
}

export function useInventoryAvailability(input: AvailabilityQueryInput) {
  const apiReady = isApiConfigured() && Boolean(loadAuthSession()?.accessToken)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<AvailabilityResponse | null>(null)

  const scheduleReady = Boolean(
    input.localities.length &&
      input.startDate &&
      input.endDate &&
      input.endDate >= input.startDate &&
      input.daysOfWeek.length &&
      !validateOperatingHours(input.startTime, input.endTime),
  )

  const queryKey = [
    input.city,
    input.localities.join('|'),
    input.startDate,
    input.endDate,
    input.startTime,
    input.endTime,
    input.daysOfWeek.join('|'),
  ].join('::')

  useEffect(() => {
    if (!scheduleReady || !apiReady) {
      setPayload(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    const handle = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      void queryAvailability({
        city: input.city,
        localities: input.localities,
        startDate: input.startDate,
        endDate: input.endDate,
        startTime: input.startTime,
        endTime: input.endTime,
        timezone: 'Asia/Kolkata',
        daysOfWeek: input.daysOfWeek,
      })
        .then((result) => {
          if (!cancelled) setPayload(result)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setPayload(null)
          if (err instanceof ApiError) setError(err.message)
          else setError(err instanceof Error ? err.message : 'Could not load inventory availability.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 280)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady, scheduleReady, queryKey])

  const previewCounts = useMemo(() => {
    if (apiReady || !input.localities.length || !scheduleReady) return [] as PreviewAreaCount[]
    return computePreviewAreaCounts({
      city: input.city || 'Bengaluru',
      localities: input.localities,
      startDate: input.startDate,
      endDate: input.endDate,
      startTime: input.startTime || '08:00',
      endTime: input.endTime || '20:00',
    })
  }, [apiReady, input.city, input.localities, input.startDate, input.endDate, input.startTime, input.endTime, scheduleReady])

  const mode: 'live' | 'preview' | 'none' = payload
    ? 'live'
    : !apiReady && input.localities.length
      ? 'preview'
      : 'none'

  const areas = useMemo(() => {
    if (mode === 'live' && payload) {
      return input.localities.map((locality) => {
        const rows = payload.screens.filter((screen) => screen.locality === locality)
        const available = rows.filter((s) => s.availability === 'available').length
        const booked = rows.filter((s) => s.availability === 'booked').length
        const unavailable = rows.filter((s) => s.availability === 'unavailable').length
        return rowFromCounts(
          locality,
          {
            locality,
            totalRegistered: rows.length,
            available,
            booked,
            unavailable,
          },
          input.locationRequests[locality] ?? 0,
          'live',
        )
      })
    }
    if (mode === 'preview' && scheduleReady) {
      return input.localities.map((locality) =>
        rowFromCounts(
          locality,
          previewCounts.find((row) => row.locality === locality),
          input.locationRequests[locality] ?? 0,
          'preview',
        ),
      )
    }
    if (mode === 'preview') {
      return catalogFallbackAreas(input.localities, input.locationRequests)
    }
    return input.localities.map((locality) => ({
      locality,
      totalRegistered: null,
      eligible: null,
      available: null,
      booked: null,
      unavailable: null,
      requested: input.locationRequests[locality] ?? 0,
      status: 'disconnected' as const,
    }))
  }, [mode, payload, input.localities, input.locationRequests, previewCounts, scheduleReady])

  const totals = useMemo(() => {
    const requested = input.localities.reduce((sum, area) => sum + (input.locationRequests[area] ?? 0), 0)
    if (mode === 'none') {
      return {
        totalRegistered: null as number | null,
        available: null as number | null,
        booked: null as number | null,
        unavailable: null as number | null,
        requested,
        allocated: 0,
      }
    }
    return {
      totalRegistered: areas.reduce((sum, row) => sum + (row.totalRegistered ?? 0), 0),
      available: areas.reduce((sum, row) => sum + (row.available ?? 0), 0),
      booked: areas.reduce((sum, row) => sum + (row.booked ?? 0), 0),
      unavailable: areas.reduce((sum, row) => sum + (row.unavailable ?? 0), 0),
      requested,
      allocated: 0,
    }
  }, [mode, areas, input.localities, input.locationRequests])

  return {
    apiReady,
    scheduleReady,
    loading,
    error,
    payload,
    areas,
    totals,
    disconnected: mode === 'none',
    isPreview: mode === 'preview',
    note:
      mode === 'preview'
        ? PREVIEW_NOTE
        : mode === 'none'
          ? 'Inventory is not connected for these areas yet.'
          : payload?.note,
  }
}
