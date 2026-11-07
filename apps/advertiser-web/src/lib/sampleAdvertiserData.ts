import type { AdvertiserCreative } from '../api/advertiserWorkspace'
import type { CampaignStatus, PaymentStatus } from '../types/advertiser'
import {
  loadLocalCampaigns,
  pushLocalInvoice,
  pushLocalPayment,
  saveCreativeToLibrary,
  writeLocalCampaign,
  type StoredCampaign,
} from './advertiserRecords'
import { estimateTestBudgetInr, TEST_PRICING } from './testPricing'

export const SAMPLE_COMPANY = {
  legalName: 'Namma Foods Pvt Ltd',
  tradeName: 'Namma Foods',
  contactEmail: 'demo.nammafoods@autoads.test',
  contactName: 'Priya Nair',
  city: 'Bengaluru',
  businessType: 'Private Limited',
  industry: 'Food & Beverage',
} as const

/** Stable ids so re-seeding is idempotent and never clashes with real CAM-L-* rows. */
const SAMPLE_MARK = '[TEST]'

function ymdOffset(daysFromToday: number) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + daysFromToday)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function sampleCampaign(input: {
  id: string
  name: string
  status: CampaignStatus
  locations: string[]
  requestedAutos: number
  allocatedAutos: number
  startOffset: number
  dayCount: number
  budgetInr: number
  creativeName: string
  creativeId: string | null
  paymentStatus?: PaymentStatus
  description: string
  advertiserKey: string
}): StoredCampaign {
  const startDate = ymdOffset(input.startOffset)
  const endDate = ymdOffset(input.startOffset + input.dayCount - 1)
  const now = new Date().toISOString()
  return {
    id: input.id,
    name: `${SAMPLE_MARK} ${input.name}`,
    status: input.status,
    startDate,
    endDate,
    locations: input.locations,
    requestedAutos: input.requestedAutos,
    allocatedAutos: input.allocatedAutos,
    budgetInr: input.budgetInr,
    estimatedReach: 0,
    advertiserKey: input.advertiserKey,
    creativeName: input.creativeName,
    creativeId: input.creativeId,
    approvalStatus: input.status === 'Draft' ? 'Draft' : 'Advertiser launched',
    deliveryStatus:
      input.status === 'Live'
        ? 'Live'
        : input.status === 'Scheduled'
          ? 'Scheduled'
          : input.status === 'Paused'
            ? 'Paused'
            : input.status === 'Completed'
              ? 'Completed'
              : 'Not started',
    paymentStatus: input.paymentStatus ?? 'Pending',
    description: `${input.description}\n\n${SAMPLE_MARK} Sample advertiser data · ${TEST_PRICING.label} · not live fleet delivery.`,
    createdAt: now,
    updatedAt: now,
  }
}

export function hasSampleAdvertiserData(advertiserKey: string) {
  return loadLocalCampaigns(advertiserKey).some((row) => row.id.startsWith('TEST-CAM-') || row.name.includes(SAMPLE_MARK))
}

/**
 * Idempotent seed for one demo advertiser. Never deletes existing non-TEST campaigns.
 */
export function seedNammaFoodsSampleData(advertiserKey: string) {
  if (hasSampleAdvertiserData(advertiserKey)) {
    return { created: false, reason: 'Sample data already present for this advertiser.' as const }
  }

  const creative = saveCreativeToLibrary(advertiserKey, {
    id: 'TEST-CR-NAMMA-WEEKEND',
    fileName: `${SAMPLE_MARK} Namma Weekend Offer.jpg`,
    type: 'Image',
    sizeBytes: 420_000,
    width: 1920,
    height: 1080,
    campaignName: 'Library',
    moderationStatus: 'Draft',
    previewUrl: '',
  })

  const weekendBudget = estimateTestBudgetInr(500, 30)

  const campaigns: StoredCampaign[] = [
    sampleCampaign({
      id: 'TEST-CAM-WEEKEND',
      name: 'Namma Foods Weekend Offers',
      status: 'Live',
      locations: ['Whitefield'],
      requestedAutos: 500,
      // Test planned allocation only — not live device assignment.
      allocatedAutos: 500,
      startOffset: -5,
      dayCount: 30,
      budgetInr: weekendBudget,
      creativeName: creative.name,
      creativeId: creative.id,
      paymentStatus: 'Paid',
      description: 'Weekend offers for Whitefield · 30s creatives · 30-day window.',
      advertiserKey,
    }),
    sampleCampaign({
      id: 'TEST-CAM-BREAKFAST',
      name: 'Namma Foods Breakfast Push',
      status: 'Scheduled',
      locations: ['Koramangala', 'Indiranagar'],
      requestedAutos: 200,
      allocatedAutos: 0,
      startOffset: 7,
      dayCount: 14,
      budgetInr: estimateTestBudgetInr(200, 14),
      creativeName: creative.name,
      creativeId: creative.id,
      paymentStatus: 'Pending',
      description: 'Morning breakfast promo across Koramangala and Indiranagar.',
      advertiserKey,
    }),
    sampleCampaign({
      id: 'TEST-CAM-DRAFT',
      name: 'Namma Foods Draft Menu Launch',
      status: 'Draft',
      locations: ['HSR Layout'],
      requestedAutos: 80,
      allocatedAutos: 0,
      startOffset: 14,
      dayCount: 10,
      budgetInr: estimateTestBudgetInr(80, 10),
      creativeName: '—',
      creativeId: null,
      description: 'Draft only — creative not attached yet.',
      advertiserKey,
    }),
    sampleCampaign({
      id: 'TEST-CAM-MONSOON',
      name: 'Namma Foods Monsoon Special',
      status: 'Paused',
      locations: ['Marathahalli'],
      requestedAutos: 150,
      allocatedAutos: 150,
      startOffset: -10,
      dayCount: 21,
      budgetInr: estimateTestBudgetInr(150, 21),
      creativeName: creative.name,
      creativeId: creative.id,
      paymentStatus: 'Authorized',
      description: 'Paused mid-flight for creative refresh testing.',
      advertiserKey,
    }),
    sampleCampaign({
      id: 'TEST-CAM-Q3',
      name: 'Namma Foods Completed Q3',
      status: 'Completed',
      locations: ['Electronic City'],
      requestedAutos: 100,
      allocatedAutos: 100,
      startOffset: -45,
      dayCount: 20,
      budgetInr: estimateTestBudgetInr(100, 20),
      creativeName: creative.name,
      creativeId: creative.id,
      paymentStatus: 'Paid',
      description: 'Completed sample campaign for filter and history testing.',
      advertiserKey,
    }),
  ]

  for (const row of campaigns) {
    writeLocalCampaign(row)
  }

  pushLocalInvoice(advertiserKey, {
    id: 'TEST-INV-WEEKEND',
    campaignName: campaigns[0]!.name,
    amountInr: weekendBudget,
    paymentStatus: 'Paid',
    issuedOn: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
  })

  pushLocalPayment(advertiserKey, {
    id: 'TEST-PAY-WEEKEND',
    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    reference: 'TEST-UPI-NAMMA-001',
    campaignName: campaigns[0]!.name,
    amountInr: weekendBudget,
    status: 'Paid',
  })

  pushLocalInvoice(advertiserKey, {
    id: 'TEST-INV-MONSOON',
    campaignName: campaigns[3]!.name,
    amountInr: campaigns[3]!.budgetInr,
    paymentStatus: 'Authorized',
    issuedOn: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
  })

  return {
    created: true,
    reason: 'Seeded Namma Foods [TEST] campaigns, creative, and billing rows.' as const,
    campaignCount: campaigns.length,
    weekendBudgetInr: weekendBudget,
    creative: creative as AdvertiserCreative,
  }
}
