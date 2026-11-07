export const creativeFormats = ['Video', 'Static image'] as const
export type CreativeFormat = (typeof creativeFormats)[number]

export const weekDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export type WeekDay = (typeof weekDays)[number]

export const campaignObjectives = [
  'Brand Awareness',
  'Product Promotion',
  'Store Visits',
  'Lead Generation',
] as const

export type CampaignObjective = (typeof campaignObjectives)[number]

export type InventoryArea = {
  city: string
  area: string
  availableDevices: number
  requestedAutos: number
  allocatedAutos: number
}

export type CreativeImageOptimization = {
  optimized: boolean
  originalSizeBytes: number
  optimizedSizeBytes: number
  originalWidth: number
  originalHeight: number
  finalWidth: number
  finalHeight: number
  reductionPercent: number
  message: string
  qualityWarning?: string | null
}

export type CreativeAsset = {
  /** Shared Creative Library id — set when selected or after first persist. */
  id: string | null
  fileName: string
  format: CreativeFormat
  sizeBytes: number
  durationSeconds: number | null
  previewUrl: string
  moderationStatus: 'Draft' | 'Pending moderation' | 'Approved' | 'Revision Required'
  /** Present for newly processed local uploads (browser-side optimize). */
  mimeType?: string
  width?: number | null
  height?: number | null
  optimization?: CreativeImageOptimization | null
}

export type CampaignDraft = {
  name: string
  objective: CampaignObjective | ''
  description: string
  landingPageUrl: string
  format: CreativeFormat | ''
  city: string
  locations: string[]
  /** Per-area requested auto counts (sum syncs to requestedAutos) */
  locationRequests: Record<string, number>
  /** Optional screen ids when live inventory selection is used */
  selectedScreenIds: string[]
  requestedAutos: number
  adDurationSeconds: number
  operatingStart: string
  operatingEnd: string
  startDate: string
  endDate: string
  daysOfWeek: WeekDay[]
  frequencyCap: number
  campaignBudgetInr: number
  creative: CreativeAsset | null
}

/** Three-stage advertiser campaign builder (Create ad → Audience & schedule → Budget & review). */
export type WizardStepId = 1 | 2 | 3
