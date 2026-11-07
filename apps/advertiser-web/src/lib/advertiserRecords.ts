/**
 * Advertiser-scoped local records (pre-NestJS / offline).
 * Scoped by advertiser key — never shared across companies.
 * When NestJS + Supabase are live, these merge behind API responses.
 */

import type { AdvertiserActivity, AdvertiserCreative } from '../api/advertiserWorkspace'
import type {
  CampaignRow,
  CampaignStatus,
  InvoiceSummary,
  PaymentHistoryRow,
  PaymentStatus,
} from '../types/advertiser'
import type { CampaignDraft } from '../types/campaignWizard'
import { estimatedCampaignReach } from './campaignQuote'

const CAMPAIGNS_KEY = 'autoads.advertiser.campaigns'
const CREATIVES_KEY = 'autoads.advertiser.creatives'
const ACTIVITY_KEY = 'autoads.advertiser.activity'
const INVOICES_KEY = 'autoads.advertiser.invoices'
const PAYMENTS_KEY = 'autoads.advertiser.payments'

export type StoredCampaign = CampaignRow & {
  advertiserKey: string
  creativeName: string
  creativeId: string | null
  approvalStatus: string
  deliveryStatus: string
  paymentStatus: PaymentStatus
  description?: string
  updatedAt: string
  createdAt: string
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function loadLocalCampaigns(advertiserKey: string): StoredCampaign[] {
  return readJson<StoredCampaign[]>(CAMPAIGNS_KEY, []).filter((row) => row.advertiserKey === advertiserKey)
}

export function loadLocalCreatives(advertiserKey: string): AdvertiserCreative[] {
  return readJson<(AdvertiserCreative & { advertiserKey: string; archived?: boolean })[]>(CREATIVES_KEY, [])
    .filter((row) => row.advertiserKey === advertiserKey && !row.archived)
    .map(({ advertiserKey: _k, archived: _a, ...creative }) => creative)
}

export function findLocalCreative(advertiserKey: string, creativeId: string): AdvertiserCreative | null {
  const row = readJson<(AdvertiserCreative & { advertiserKey: string; archived?: boolean })[]>(CREATIVES_KEY, []).find(
    (item) => item.advertiserKey === advertiserKey && item.id === creativeId && !item.archived,
  )
  if (!row) return null
  const { advertiserKey: _k, archived: _a, ...creative } = row
  return creative
}

/** Updates campaign label on a library asset — never deletes or duplicates the file. */
export function touchCreativeCampaignLabel(advertiserKey: string, creativeId: string, campaignName: string) {
  const all = readJson<(AdvertiserCreative & { advertiserKey: string; archived?: boolean })[]>(CREATIVES_KEY, [])
  const next = all.map((row) =>
    row.advertiserKey === advertiserKey && row.id === creativeId
      ? { ...row, campaign: campaignName || row.campaign }
      : row,
  )
  writeJson(CREATIVES_KEY, next)
}

export function loadLocalActivity(advertiserKey: string): AdvertiserActivity[] {
  return readJson<(AdvertiserActivity & { advertiserKey: string })[]>(ACTIVITY_KEY, [])
    .filter((row) => row.advertiserKey === advertiserKey)
    .map(({ advertiserKey: _k, ...item }) => item)
    .sort((a, b) => b.sortAt - a.sortAt)
}

export function loadLocalInvoices(advertiserKey: string): InvoiceSummary[] {
  return readJson<(InvoiceSummary & { advertiserKey: string })[]>(INVOICES_KEY, [])
    .filter((row) => row.advertiserKey === advertiserKey)
    .map(({ advertiserKey: _k, ...row }) => row)
}

export function loadLocalPayments(advertiserKey: string): PaymentHistoryRow[] {
  return readJson<(PaymentHistoryRow & { advertiserKey: string })[]>(PAYMENTS_KEY, [])
    .filter((row) => row.advertiserKey === advertiserKey)
    .map(({ advertiserKey: _k, ...row }) => row)
}

export function writeLocalCampaign(row: StoredCampaign) {
  const all = readJson<StoredCampaign[]>(CAMPAIGNS_KEY, [])
  const without = all.filter((item) => !(item.advertiserKey === row.advertiserKey && item.id === row.id))
  without.unshift(row)
  writeJson(CAMPAIGNS_KEY, without)
  pushActivity(row.advertiserKey, {
    title: `Campaign ${row.status.toLowerCase()}`,
    body: `${row.name} (${row.id}) saved for testing.`,
    at: new Date().toLocaleString('en-IN'),
    kind: 'campaign',
  })
}

export function pushLocalInvoice(advertiserKey: string, invoice: InvoiceSummary) {
  const all = readJson<(InvoiceSummary & { advertiserKey: string })[]>(INVOICES_KEY, [])
  const without = all.filter((row) => !(row.advertiserKey === advertiserKey && row.id === invoice.id))
  without.unshift({ ...invoice, advertiserKey })
  writeJson(INVOICES_KEY, without)
}

export function pushLocalPayment(advertiserKey: string, payment: PaymentHistoryRow) {
  const all = readJson<(PaymentHistoryRow & { advertiserKey: string })[]>(PAYMENTS_KEY, [])
  const without = all.filter((row) => !(row.advertiserKey === advertiserKey && row.id === payment.id))
  without.unshift({ ...payment, advertiserKey })
  writeJson(PAYMENTS_KEY, without)
}

function pushActivity(advertiserKey: string, item: Omit<AdvertiserActivity, 'id' | 'sortAt'> & { id?: string }) {
  const all = readJson<(AdvertiserActivity & { advertiserKey: string })[]>(ACTIVITY_KEY, [])
  const now = Date.now()
  all.unshift({
    id: item.id ?? `act-${now}`,
    title: item.title,
    body: item.body,
    at: item.at,
    kind: item.kind,
    sortAt: now,
    advertiserKey,
  })
  writeJson(ACTIVITY_KEY, all.slice(0, 200))
}

function nextCampaignId() {
  return `CAM-L-${Date.now().toString(36).toUpperCase()}`
}

function nextCreativeId() {
  return `CR-L-${Date.now().toString(36).toUpperCase()}`
}

export function saveCreativeToLibrary(
  advertiserKey: string,
  input: {
    fileName: string
    type: 'Video' | 'Image'
    sizeBytes: number
    previewUrl?: string
    campaignName?: string
    moderationStatus?: AdvertiserCreative['status']
    width?: number | null
    height?: number | null
    /** Prefer a canonical API id when available so local + remote stay one record. */
    id?: string
  },
): AdvertiserCreative {
  const all = readJson<(AdvertiserCreative & { advertiserKey: string; archived?: boolean; previewUrl?: string })[]>(
    CREATIVES_KEY,
    [],
  )
  const sizeKb = Math.max(1, Math.round(input.sizeBytes / 1024))
  const sizeLabel =
    input.sizeBytes >= 1024 * 1024
      ? `${(input.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${sizeKb} KB`
  const spec =
    input.width && input.height
      ? `${input.width}×${input.height}`
      : 'Library asset'
  const id = input.id || nextCreativeId()
  const existingIndex = all.findIndex((row) => row.advertiserKey === advertiserKey && row.id === id)
  const creative: AdvertiserCreative & { advertiserKey: string; previewUrl?: string } = {
    id,
    name: input.fileName,
    type: input.type,
    size: sizeLabel,
    sizeBytes: input.sizeBytes,
    spec,
    status: input.moderationStatus ?? 'Draft',
    version: 'v1',
    campaign: input.campaignName || 'Library',
    previewNote: 'Saved to Creative Library · moderation status updates after platform review',
    advertiserKey,
    previewUrl: input.previewUrl,
    uploadedAt: new Date().toLocaleString('en-IN'),
  }
  if (existingIndex >= 0) all[existingIndex] = { ...all[existingIndex], ...creative }
  else all.unshift(creative)
  writeJson(CREATIVES_KEY, all)
  pushActivity(advertiserKey, {
    title: 'Creative uploaded',
    body: `${creative.name} added to Creatives library.`,
    at: new Date().toLocaleString('en-IN'),
    kind: 'creative',
  })
  return creative
}

export function archiveCreative(advertiserKey: string, creativeId: string) {
  const all = readJson<(AdvertiserCreative & { advertiserKey: string; archived?: boolean })[]>(CREATIVES_KEY, [])
  const next = all.map((row) =>
    row.advertiserKey === advertiserKey && row.id === creativeId ? { ...row, archived: true } : row,
  )
  writeJson(CREATIVES_KEY, next)
}

/** Rename a library creative for this advertiser. Returns false if not found. */
export function renameCreative(advertiserKey: string, creativeId: string, nextName: string) {
  const name = nextName.trim()
  if (!name) return false
  const all = readJson<(AdvertiserCreative & { advertiserKey: string; archived?: boolean })[]>(CREATIVES_KEY, [])
  let found = false
  const next = all.map((row) => {
    if (row.advertiserKey !== advertiserKey || row.id !== creativeId) return row
    found = true
    return { ...row, name }
  })
  if (!found) return false
  writeJson(CREATIVES_KEY, next)
  return true
}

export function upsertCampaignFromDraft(
  advertiserKey: string,
  draft: CampaignDraft,
  options: { status: CampaignStatus; existingId?: string; creativeId?: string | null },
): StoredCampaign {
  const all = readJson<StoredCampaign[]>(CAMPAIGNS_KEY, [])
  const now = new Date().toISOString()
  const existing = options.existingId ? all.find((row) => row.id === options.existingId) : undefined
  const id = existing?.id ?? nextCampaignId()

  // Advertiser-only phase: campaigns launch without admin approval.
  // Admin review statuses remain in the type system for a future admin portal.
  const deliveryStatus =
    options.status === 'Scheduled'
      ? 'Scheduled'
      : options.status === 'Live'
        ? 'Live'
        : options.status === 'Completed'
          ? 'Completed'
          : options.status === 'Cancelled'
            ? 'Cancelled'
            : options.status === 'Paused'
              ? 'Paused'
              : options.status === 'Draft'
                ? 'Not started'
                : 'Not started'

  const approvalStatus =
    options.status === 'Draft'
      ? 'Draft'
      : options.status === 'Cancelled'
        ? 'Cancelled'
        : 'Advertiser launched'

  const row: StoredCampaign = {
    id,
    name: draft.name.trim() || 'Untitled campaign',
    status: options.status,
    startDate: draft.startDate,
    endDate: draft.endDate,
    locations: draft.locations,
    requestedAutos: draft.requestedAutos,
    allocatedAutos: existing?.allocatedAutos ?? 0,
    budgetInr: draft.campaignBudgetInr || 0,
    estimatedReach: estimatedCampaignReach(draft),
    advertiserKey,
    creativeName: draft.creative?.fileName || existing?.creativeName || '—',
    creativeId: options.creativeId ?? existing?.creativeId ?? null,
    approvalStatus,
    deliveryStatus,
    paymentStatus: existing?.paymentStatus ?? 'Pending',
    description: draft.description,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  const without = all.filter((item) => item.id !== id)
  without.unshift(row)
  writeJson(CAMPAIGNS_KEY, without)

  pushActivity(advertiserKey, {
    title: row.status === 'Draft' ? 'Campaign created' : 'Campaign submitted',
    body: `${row.name} (${row.id}) · approval ${row.approvalStatus} · delivery ${row.deliveryStatus}`,
    at: new Date().toLocaleString('en-IN'),
    kind: 'campaign',
  })

  return row
}

export function updateCampaignStatus(
  advertiserKey: string,
  campaignId: string,
  status: CampaignStatus,
  note?: string,
) {
  const all = readJson<StoredCampaign[]>(CAMPAIGNS_KEY, [])
  const next = all.map((row) => {
    if (row.advertiserKey !== advertiserKey || row.id !== campaignId) return row
    const deliveryStatus =
      status === 'Live'
        ? 'Live'
        : status === 'Paused'
          ? 'Paused'
          : status === 'Scheduled'
            ? 'Scheduled'
            : status === 'Completed'
              ? 'Completed'
              : status === 'Cancelled'
                ? 'Cancelled'
                : row.deliveryStatus
    return {
      ...row,
      status,
      deliveryStatus,
      approvalStatus:
        status === 'Revision Required'
          ? 'Revision Required'
          : status === 'Rejected'
            ? 'Rejected'
            : row.approvalStatus,
      updatedAt: new Date().toISOString(),
    }
  })
  writeJson(CAMPAIGNS_KEY, next)
  pushActivity(advertiserKey, {
    title: `Campaign ${status.toLowerCase()}`,
    body: note || `${campaignId} status updated to ${status}.`,
    at: new Date().toLocaleString('en-IN'),
    kind: 'campaign',
  })
}

export function duplicateCampaign(advertiserKey: string, campaignId: string): StoredCampaign | null {
  const all = readJson<StoredCampaign[]>(CAMPAIGNS_KEY, [])
  const source = all.find((row) => row.advertiserKey === advertiserKey && row.id === campaignId)
  if (!source) return null
  const now = new Date().toISOString()
  const copy: StoredCampaign = {
    ...source,
    id: nextCampaignId(),
    name: `${source.name} (copy)`,
    status: 'Draft',
    approvalStatus: 'Draft',
    deliveryStatus: 'Not started',
    paymentStatus: 'Pending',
    allocatedAutos: 0,
    createdAt: now,
    updatedAt: now,
  }
  all.unshift(copy)
  writeJson(CAMPAIGNS_KEY, all)
  pushActivity(advertiserKey, {
    title: 'Campaign created',
    body: `Duplicated ${source.id} as ${copy.id}.`,
    at: new Date().toLocaleString('en-IN'),
    kind: 'campaign',
  })
  return copy
}

export function clearAdvertiserRecords(advertiserKey: string) {
  writeJson(
    CAMPAIGNS_KEY,
    readJson<StoredCampaign[]>(CAMPAIGNS_KEY, []).filter((row) => row.advertiserKey !== advertiserKey),
  )
  writeJson(
    CREATIVES_KEY,
    readJson<(AdvertiserCreative & { advertiserKey: string })[]>(CREATIVES_KEY, []).filter(
      (row) => row.advertiserKey !== advertiserKey,
    ),
  )
  writeJson(
    ACTIVITY_KEY,
    readJson<(AdvertiserActivity & { advertiserKey: string })[]>(ACTIVITY_KEY, []).filter(
      (row) => row.advertiserKey !== advertiserKey,
    ),
  )
  writeJson(
    INVOICES_KEY,
    readJson<(InvoiceSummary & { advertiserKey: string })[]>(INVOICES_KEY, []).filter(
      (row) => row.advertiserKey !== advertiserKey,
    ),
  )
  writeJson(
    PAYMENTS_KEY,
    readJson<(PaymentHistoryRow & { advertiserKey: string })[]>(PAYMENTS_KEY, []).filter(
      (row) => row.advertiserKey !== advertiserKey,
    ),
  )
}
