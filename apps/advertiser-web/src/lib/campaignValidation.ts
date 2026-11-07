import { creativeSpecs } from '../data/campaignWizard'
import { campaignDayCount, operatingHoursPerDay } from './campaignQuote'
import {
  assertOperatingHoursValid,
  OPERATING_HOURS_RANGE_ERROR,
  validateOperatingHours,
} from './operatingHours'
import type { CampaignDraft, WizardStepId } from '../types/campaignWizard'

export {
  assertOperatingHoursValid,
  OPERATING_HOURS_RANGE_ERROR,
  parseTimeToMinutes,
  validateOperatingHours,
} from './operatingHours'

export function validateStep(step: WizardStepId, draft: CampaignDraft): string[] {
  switch (step) {
    case 1: {
      const errors: string[] = []
      if (!draft.objective) errors.push('Select a campaign objective.')
      if (!draft.name.trim()) errors.push('Enter a campaign name.')
      if (draft.landingPageUrl.trim()) {
        try {
          const url = new URL(draft.landingPageUrl.trim())
          if (!['http:', 'https:'].includes(url.protocol)) {
            errors.push('Landing page must be an http(s) URL.')
          }
        } catch {
          errors.push('Enter a valid landing page URL (or leave it blank).')
        }
      }
      if (!draft.creative) errors.push('Upload a creative or choose one from your library.')
      else if (!draft.format) errors.push('Choose Image or Video for this creative.')
      else if (draft.format === 'Video') {
        const duration = draft.creative.durationSeconds
        if (
          duration != null &&
          (duration < creativeSpecs.video.minDurationSeconds ||
            duration > creativeSpecs.video.maxDurationSeconds)
        ) {
          errors.push(
            `Video duration must be ${creativeSpecs.video.minDurationSeconds}–${creativeSpecs.video.maxDurationSeconds} seconds.`,
          )
        }
        if (!draft.creative.id) {
          const maxBytes = creativeSpecs.video.maxSizeMb * 1024 * 1024
          if (draft.creative.sizeBytes > maxBytes) {
            errors.push(`Video must be ${creativeSpecs.video.maxSizeMb} MB or smaller.`)
          }
        }
      } else if (draft.format === 'Static image' && !draft.creative.id) {
        const maxBytes = creativeSpecs.image.maxSizeMb * 1024 * 1024
        if (draft.creative.sizeBytes > maxBytes) {
          errors.push(`Image must be ${creativeSpecs.image.maxSizeMb} MB or smaller after optimization.`)
        }
      }
      return errors
    }
    case 2: {
      const errors: string[] = []
      if (!draft.locations.length) errors.push('Select at least one Bengaluru area.')
      if (!draft.startDate || !draft.endDate) errors.push('Set campaign start and end dates.')
      if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
        errors.push('End date must be on or after the start date.')
      }
      if (campaignDayCount(draft) < 1) errors.push('Campaign must run for at least one day.')
      const hoursError = validateOperatingHours(draft.operatingStart, draft.operatingEnd)
      if (hoursError) errors.push(hoursError)
      else if (operatingHoursPerDay(draft) <= 0) errors.push(OPERATING_HOURS_RANGE_ERROR)
      if (!draft.daysOfWeek.length) errors.push('Select at least one operating weekday.')
      if (draft.adDurationSeconds < 10 || draft.adDurationSeconds > 30) {
        errors.push('Advertisement duration must be between 10 and 30 seconds.')
      }
      if (draft.frequencyCap < 1) errors.push('Set frequency cap to at least 1 play per device per day.')
      const requestedTotal = draft.locations.reduce(
        (sum, area) => sum + (draft.locationRequests[area] ?? 0),
        0,
      )
      const effectiveRequested = requestedTotal > 0 ? requestedTotal : draft.requestedAutos
      if (effectiveRequested < 1) {
        errors.push('Request at least one auto-rickshaw across your selected areas.')
      }
      if (draft.campaignBudgetInr < 1) {
        errors.push('Enter a committed campaign budget (INR) before continuing to review.')
      }
      return errors
    }
    case 3: {
      const errors: string[] = []
      const hoursError = validateOperatingHours(draft.operatingStart, draft.operatingEnd)
      if (hoursError) errors.push(hoursError)
      return errors
    }
  }
}

/** Final save/submit gate — same rules NestJS should enforce before persisting a campaign. */
export function validateCampaignBeforeSave(draft: CampaignDraft): string[] {
  const errors: string[] = []
  for (const step of [1, 2, 3] as const) {
    errors.push(...validateStep(step, draft))
  }
  try {
    assertOperatingHoursValid(draft)
  } catch (error) {
    const message = error instanceof Error ? error.message : OPERATING_HOURS_RANGE_ERROR
    if (!errors.includes(message)) errors.push(message)
  }
  return [...new Set(errors)]
}
