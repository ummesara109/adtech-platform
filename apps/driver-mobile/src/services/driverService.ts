import type {
  DeviceAssignment,
  DriverDashboard,
  DriverProfile,
  EarningItem,
  IncentiveItem,
  KycStatus,
  PayoutItem,
  PlaybackItem,
  VehicleInfo,
} from '../types/api'
import { apiRequest } from './apiClient'

export type ActivitySummary = {
  reportingDate: string
  timeZone: string
  currency: string
  runningHours: {
    hasRecords: boolean
    totalValidSec: number | null
    totalLabel: string | null
    targetHoursPerDay: number
    buckets: {
      morning: string
      afternoon: string
      evening: string
    } | null
  }
  playback: {
    hasRecords: boolean
    totalCompletedToday: number | null
    vsYesterdayPct: number | null
    weekly: { day: string; count: number }[]
  }
  earningsTrend: { periodLabel: string; netAmountInr: number; grossAmountInr: number }[]
  incentives: { id: string; title: string; amountInr: number; status: string }[]
  incentiveProgress: { currentHours: number; targetHours: number; label: string }
  payouts: {
    id: string
    amountInr: number
    status: string
    reference: string
    paidOn: string | null
    createdAt: string
  }[]
}

export const driverService = {
  dashboard: () => apiRequest<DriverDashboard>('/driver/dashboard'),
  activity: () => apiRequest<ActivitySummary>('/driver/activity/summary'),
  profile: () => apiRequest<DriverProfile>('/driver/profile'),
  updateProfile: (body: Record<string, string | undefined>) =>
    apiRequest<DriverProfile>('/driver/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  kyc: () => apiRequest<KycStatus>('/driver/kyc'),
  uploadKyc: (documentId: string, storageKey: string) =>
    apiRequest('/driver/kyc/documents', {
      method: 'POST',
      body: JSON.stringify({ documentId, storageKey }),
    }),
  uploadKycFile: async (documentId: string, file: { uri: string; name: string; type: string }) => {
    const form = new FormData()
    form.append('documentId', documentId)
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob)
    return apiRequest('/driver/kyc/documents/upload', { method: 'POST', body: form })
  },
  uploadRcFile: async (file: { uri: string; name: string; type: string }) => {
    const form = new FormData()
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob)
    return apiRequest('/driver/vehicle/rc/upload', { method: 'POST', body: form })
  },
  submitKyc: () => apiRequest<{ kycStatus: string }>('/driver/kyc/submit', { method: 'POST' }),
  vehicle: () => apiRequest<{ vehicle: VehicleInfo | null }>('/driver/vehicle'),
  registerVehicle: (body: {
    registrationNumber: string
    makeModel?: string
    vehicleType?: string
    rcStorageKey?: string
    year?: number
    color?: string
  }) => apiRequest<{ vehicle: VehicleInfo }>('/driver/vehicle', { method: 'POST', body: JSON.stringify(body) }),
  device: () => apiRequest<{ assignment: DeviceAssignment | null }>('/driver/device'),
  pairDevice: (pairingCode: string) =>
    apiRequest<{ pairingStatus: string }>('/driver/device/pair', {
      method: 'POST',
      body: JSON.stringify({ pairingCode }),
    }),
  disconnectDevice: () => apiRequest('/driver/device/disconnect', { method: 'POST' }),
  playback: () => apiRequest<{ items: PlaybackItem[] }>('/driver/playback'),
  earnings: () => apiRequest<{ items: EarningItem[] }>('/driver/earnings'),
  incentives: () => apiRequest<{ items: IncentiveItem[] }>('/driver/incentives'),
  payouts: () => apiRequest<{ items: PayoutItem[] }>('/driver/payouts'),
  supportIssue: (subject: string, description: string) =>
    apiRequest<{ issue: { id: string; status: string } }>('/driver/support/issues', {
      method: 'POST',
      body: JSON.stringify({ subject, description }),
    }),
  supportIssues: () =>
    apiRequest<{
      items: { id: string; subject: string; description: string; status: string; createdAt: string }[]
    }>('/driver/support/issues'),
}
