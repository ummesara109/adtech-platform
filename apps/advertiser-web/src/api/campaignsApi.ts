import type { CampaignRow, CampaignStatus } from '../types/advertiser'
import { apiRequest } from './httpClient'

export type CampaignListResponse = {
  items: CampaignRow[]
  total: number
  page: number
  pageSize: number
  pageCount: number
  locations: string[]
}

export type CampaignStatusEventRow = {
  id: string
  campaignId: string
  campaignName: string
  previousStatus: string | null
  status: CampaignStatus | string
  note: string
  actorLabel: string
  at: string
  atDisplay: string
}

export type CampaignStatusEventsResponse = {
  items: CampaignStatusEventRow[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export type CampaignListQuery = {
  q?: string
  status?: string
  location?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

function toQuery(params: CampaignListQuery) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '' || value === 'all') return
    search.set(key, String(value))
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function fetchCampaigns(query: CampaignListQuery, signal?: AbortSignal) {
  return apiRequest<CampaignListResponse>(`/api/v1/advertiser/campaigns${toQuery(query)}`, { signal })
}

export function fetchCampaignStatusEvents(
  query: { campaignId?: string; page?: number; pageSize?: number } = {},
  signal?: AbortSignal,
) {
  return apiRequest<CampaignStatusEventsResponse>(
    `/api/v1/advertiser/campaigns/status-events${toQuery(query)}`,
    { signal },
  )
}

export function postCampaignAction(publicId: string, action: 'pause' | 'resume' | 'cancel' | 'duplicate') {
  return apiRequest<CampaignRow>(`/api/v1/advertiser/campaigns/${publicId}/${action}`, { method: 'POST' })
}
