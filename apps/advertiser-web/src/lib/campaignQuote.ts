import { inventoryAreas } from '../data/campaignWizard'
import type { CampaignDraft } from '../types/campaignWizard'
import { operatingHoursPerDayFromTimes } from './operatingHours'

export function availableDevicesFor(locations: string[]) {
  return inventoryAreas
    .filter((area) => locations.includes(area.area))
    .reduce((sum, area) => sum + area.availableDevices, 0)
}

export function operatingHoursPerDay(draft: CampaignDraft) {
  return operatingHoursPerDayFromTimes(draft.operatingStart, draft.operatingEnd)
}

export function campaignDayCount(draft: CampaignDraft) {
  if (!draft.startDate || !draft.endDate) return 0
  const start = new Date(draft.startDate)
  const end = new Date(draft.endDate)
  const ms = end.getTime() - start.getTime()
  if (ms < 0) return 0
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1
}

/** Modelled plays across targeted autos — not verified impressions (see architecture §8). */
export function estimatedCampaignReach(draft: CampaignDraft) {
  const days = campaignDayCount(draft)
  if (!draft.adDurationSeconds || !draft.requestedAutos || !days) return 0
  const hours = operatingHoursPerDay(draft)
  const playsPerDevice = Math.floor((hours * 3600) / draft.adDurationSeconds)
  const capped = Math.min(playsPerDevice, draft.frequencyCap || playsPerDevice)
  const activeDayFraction = draft.daysOfWeek.length / 7
  return Math.round(draft.requestedAutos * capped * days * activeDayFraction)
}
