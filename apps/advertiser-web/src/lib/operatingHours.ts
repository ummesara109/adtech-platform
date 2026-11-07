import type { CampaignDraft } from '../types/campaignWizard'

/** Shared with UI field validation and campaign save / NestJS DTO guards. */
export const OPERATING_HOURS_RANGE_ERROR = 'End time must be later than start time.'

/** Parse HTML time / 24h `HH:MM` (UI may display AM/PM) into minutes from midnight. */
export function parseTimeToMinutes(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

/**
 * Field-level operating hours validation.
 * Returns null when valid; otherwise an inline message for the End Time field (or empty fields).
 */
export function validateOperatingHours(startTime: string, endTime: string): string | null {
  if (!startTime.trim()) return 'Select a start time.'
  if (!endTime.trim()) return 'Select an end time.'

  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)

  if (startMinutes == null) return 'Select a valid start time.'
  if (endMinutes == null) return 'Select a valid end time.'
  if (endMinutes <= startMinutes) return OPERATING_HOURS_RANGE_ERROR
  return null
}

/** Gate used before persisting / submitting a campaign (frontend save path and future NestJS API). */
export function assertOperatingHoursValid(draft: Pick<CampaignDraft, 'operatingStart' | 'operatingEnd'>) {
  const error = validateOperatingHours(draft.operatingStart, draft.operatingEnd)
  if (error) {
    throw new Error(error)
  }
}

export function operatingHoursPerDayFromTimes(startTime: string, endTime: string) {
  const startMin = parseTimeToMinutes(startTime)
  const endMin = parseTimeToMinutes(endTime)
  if (startMin == null || endMin == null || endMin <= startMin) return 0
  return (endMin - startMin) / 60
}
