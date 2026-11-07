import type { CampaignDraft, InventoryArea, WizardStepId } from '../types/campaignWizard'
import { weekDays } from '../types/campaignWizard'

export const wizardSteps: {
  id: WizardStepId
  label: string
  shortLabel: string
  hint: string
  docRef: string
}[] = [
  {
    id: 1,
    label: 'Create Your Ad',
    shortLabel: 'Ad',
    hint: 'Name your campaign, choose an objective, and upload your creative.',
    docRef: 'Campaign identity and creative asset',
  },
  {
    id: 2,
    label: 'Audience & Schedule',
    shortLabel: 'Audience',
    hint: 'Target Bengaluru areas, autos, dates, hours, and playback settings.',
    docRef: 'Locations, inventory, schedule, ad duration, frequency',
  },
  {
    id: 3,
    label: 'Review Campaign',
    shortLabel: 'Review',
    hint: 'Confirm your budget and details, then submit for admin review.',
    docRef: 'Review, confirm, submit',
  },
]

export const objectiveMeta: Record<
  string,
  { blurb: string; icon: string }
> = {
  'Brand Awareness': {
    blurb: 'Reach riders and street traffic across selected Bengaluru localities.',
    icon: '◎',
  },
  'Product Promotion': {
    blurb: 'Promote a product or offer on auto-rickshaw screens for a fixed schedule.',
    icon: '◆',
  },
  'Store Visits': {
    blurb: 'Drive footfall near your Bengaluru outlets with nearby auto screens.',
    icon: '⌂',
  },
  'Lead Generation': {
    blurb: 'Push a landing page or QR-led offer from moving screens.',
    icon: '⇢',
  },
}

/** Bengaluru area catalog. availableDevices stays 0 until live inventory syncs. */
export const inventoryAreas: InventoryArea[] = [
  { city: 'Bengaluru', area: 'Whitefield', availableDevices: 0, requestedAutos: 0, allocatedAutos: 0 },
  { city: 'Bengaluru', area: 'Marathahalli', availableDevices: 0, requestedAutos: 0, allocatedAutos: 0 },
  { city: 'Bengaluru', area: 'Electronic City', availableDevices: 0, requestedAutos: 0, allocatedAutos: 0 },
  { city: 'Bengaluru', area: 'Koramangala', availableDevices: 0, requestedAutos: 0, allocatedAutos: 0 },
  { city: 'Bengaluru', area: 'Indiranagar', availableDevices: 0, requestedAutos: 0, allocatedAutos: 0 },
  { city: 'Bengaluru', area: 'HSR Layout', availableDevices: 0, requestedAutos: 0, allocatedAutos: 0 },
]

export const creativeSpecs = {
  image: {
    types: 'JPEG, PNG, WebP',
    aspectRatio: '16:9 preferred',
    resolution: 'Any — optimized & letterboxed for screen',
    maxSizeMb: 5,
    recommendedWidth: 1920,
    recommendedHeight: 1080,
  },
  video: {
    types: 'MP4, MOV',
    aspectRatio: '16:9',
    resolution: '1920×1080 preferred',
    maxSizeMb: 50,
    minDurationSeconds: 10,
    maxDurationSeconds: 30,
  },
}

export function emptyDraft(): CampaignDraft {
  return {
    name: '',
    objective: '',
    description: '',
    landingPageUrl: '',
    format: '',
    city: 'Bengaluru',
    locations: [],
    locationRequests: {},
    selectedScreenIds: [],
    requestedAutos: 0,
    adDurationSeconds: 15,
    operatingStart: '08:00',
    operatingEnd: '20:00',
    startDate: '',
    endDate: '',
    daysOfWeek: [...weekDays],
    frequencyCap: 8,
    campaignBudgetInr: 0,
    creative: null,
  }
}

export const DRAFT_STORAGE_KEY = 'adtech.advertiser.campaignDraft.v5'

/** Current wizard flow version (for migrating older local drafts). */
export const WIZARD_FLOW_VERSION = 3

/** Clamp stored wizard position onto the 3-stage flow; migrates legacy 4-step ids. */
export function normalizeWizardStep(raw: number, legacyFlow?: boolean): WizardStepId {
  const n = Math.floor(Number(raw) || 1)
  if (legacyFlow) {
    if (n <= 1) return 1
    if (n === 2) return 2
    if (n === 3) return 1
    if (n >= 4) return 3
    return 1
  }
  if (n < 1) return 1
  if (n > 3) return 3
  return n as WizardStepId
}
