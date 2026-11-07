import {
  DRAFT_STORAGE_KEY,
  emptyDraft,
  normalizeWizardStep,
  WIZARD_FLOW_VERSION,
} from '../data/campaignWizard'
import type { CampaignDraft, WizardStepId } from '../types/campaignWizard'
import { assertOperatingHoursValid } from './operatingHours'

const LEGACY_DRAFT_KEY = 'adtech.advertiser.campaignDraft.v4'

type StoredDraft = {
  draft: CampaignDraft
  step: WizardStepId
  savedAt: string
  /** Present in v5+ saves; absent for legacy v4 payloads. */
  flowVersion?: number
}

export function loadStoredDraft(): StoredDraft | null {
  try {
    let raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    let legacy = false
    if (!raw) {
      raw = localStorage.getItem(LEGACY_DRAFT_KEY)
      legacy = Boolean(raw)
    }
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDraft
    const fallback = emptyDraft()
    const step = normalizeWizardStep(Number(parsed.step) || 1, legacy)
    return {
      draft: {
        ...fallback,
        ...parsed.draft,
        selectedScreenIds: parsed.draft.selectedScreenIds ?? fallback.selectedScreenIds,
        locationRequests: parsed.draft.locationRequests ?? fallback.locationRequests,
        objective: parsed.draft.objective ?? fallback.objective,
        landingPageUrl: parsed.draft.landingPageUrl ?? fallback.landingPageUrl,
        creative: parsed.draft.creative
          ? {
              ...parsed.draft.creative,
              id: parsed.draft.creative.id ?? null,
              moderationStatus: parsed.draft.creative.moderationStatus ?? 'Draft',
            }
          : null,
      },
      step,
      savedAt: parsed.savedAt,
    }
  } catch {
    return null
  }
}

/** Persist draft only after operating-hours gate (same rule NestJS should enforce before DB write). */
export function saveStoredDraft(draft: CampaignDraft, step: WizardStepId) {
  assertOperatingHoursValid(draft)
  const payload: StoredDraft = {
    draft: { ...draft, creative: draft.creative ? { ...draft.creative, previewUrl: '' } : null },
    step,
    savedAt: new Date().toISOString(),
    flowVersion: WIZARD_FLOW_VERSION,
  }
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
  try {
    localStorage.removeItem(LEGACY_DRAFT_KEY)
  } catch {
    /* ignore */
  }
  return payload.savedAt
}

export function clearStoredDraft() {
  localStorage.removeItem(DRAFT_STORAGE_KEY)
}
