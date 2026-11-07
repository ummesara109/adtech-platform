import { apiRequest } from '../api/httpClient'
import type { AdvertiserCreative } from '../api/advertiserWorkspace'
import { loadAuthSession } from './authSession'
import { isApiConfigured } from './config'
import {
  findLocalCreative,
  saveCreativeToLibrary,
  touchCreativeCampaignLabel,
} from './advertiserRecords'

export type PersistCreativeInput = {
  advertiserKey: string
  fileName: string
  type: 'Video' | 'Image'
  sizeBytes: number
  previewUrl?: string
  mimeType?: string
  width?: number | null
  height?: number | null
  /** When set, reuses this library row — does not duplicate the file. */
  existingId?: string | null
  campaignName?: string
}

/**
 * Persist a creative once into the shared advertiser library (local + optional NestJS).
 * Reusing `existingId` only links metadata — never creates a second file record.
 */
export async function persistCreativeToLibrary(
  input: PersistCreativeInput,
): Promise<AdvertiserCreative> {
  if (input.existingId) {
    const existing = findLocalCreative(input.advertiserKey, input.existingId)
    if (existing) {
      if (input.campaignName) {
        touchCreativeCampaignLabel(input.advertiserKey, input.existingId, input.campaignName)
        return { ...existing, campaign: input.campaignName }
      }
      return existing
    }
    // Remote-only id (API library without local row) — do not POST again.
    return {
      id: input.existingId,
      name: input.fileName,
      type: input.type,
      size:
        input.sizeBytes >= 1024 * 1024
          ? `${(input.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(input.sizeBytes / 1024))} KB`,
      spec: input.width && input.height ? `${input.width}×${input.height}` : 'Library asset',
      status: 'Draft',
      version: 'v1',
      campaign: input.campaignName || 'Library',
      previewNote: 'Selected from Creative Library',
      previewUrl: input.previewUrl,
      sizeBytes: input.sizeBytes,
      uploadedAt: undefined,
    }
  }

  let canonicalId: string | undefined

  if (isApiConfigured() && loadAuthSession()?.accessToken) {
    try {
      const remote = await apiRequest<{ id: string; status?: string; previewUrl?: string }>(
        '/api/v1/advertiser/creatives',
        {
          method: 'POST',
          body: {
            fileName: input.fileName,
            type: input.type,
            sizeLabel:
              input.sizeBytes >= 1024 * 1024
                ? `${(input.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
                : `${Math.max(1, Math.round(input.sizeBytes / 1024))} KB`,
            sizeBytes: input.sizeBytes,
            mimeType: input.mimeType,
            width: input.width ?? undefined,
            height: input.height ?? undefined,
            previewUrl: input.previewUrl || undefined,
          },
        },
      )
      canonicalId = remote.id
    } catch {
      // Fall through to local-only persistence
    }
  }

  return saveCreativeToLibrary(input.advertiserKey, {
    id: canonicalId,
    fileName: input.fileName,
    type: input.type,
    sizeBytes: input.sizeBytes,
    previewUrl: input.previewUrl,
    campaignName: input.campaignName,
    width: input.width,
    height: input.height,
    moderationStatus: 'Draft',
  })
}
