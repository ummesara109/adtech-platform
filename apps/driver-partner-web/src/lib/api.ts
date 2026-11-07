const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

const TOKEN_KEY = 'autoads_driver_web_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, token)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (options.auth !== false) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(`${API_BASE}/api/v1${path}`, { ...options, headers })
  const text = await res.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }
  if (!res.ok) {
    const message =
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message: string | string[] }).message)
        : `Request failed (${res.status})`
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status)
  }
  return body as T
}

export const driverApi = {
  register: (body: { email: string; fullName: string; phone?: string }) =>
    api<{ accessToken: string; user: { fullName: string; email: string; driverId: string } }>(
      '/auth/driver/register',
      { method: 'POST', body: JSON.stringify(body), auth: false },
    ),
  login: (email: string) =>
    api<{ accessToken: string; user: { fullName: string; email: string; driverId: string } }>(
      '/auth/driver/dev-login',
      { method: 'POST', body: JSON.stringify({ email }), auth: false },
    ),
  dashboard: () => api<Record<string, unknown>>('/driver/dashboard'),
  kyc: () =>
    api<{
      kycStatus: string
      documents: { id: string; label: string; status: string; uploaded: boolean }[]
    }>('/driver/kyc'),
  uploadKyc: (documentId: string, storageKey: string) =>
    api('/driver/kyc/documents', {
      method: 'POST',
      body: JSON.stringify({ documentId, storageKey }),
    }),
  submitKyc: () => api('/driver/kyc/submit', { method: 'POST' }),
  vehicle: () => api<{ vehicle: Record<string, unknown> | null }>('/driver/vehicle'),
  registerVehicle: (body: Record<string, unknown>) =>
    api('/driver/vehicle', { method: 'POST', body: JSON.stringify(body) }),
  device: () => api<{ assignment: Record<string, unknown> | null }>('/driver/device'),
  pairDevice: (pairingCode: string) =>
    api('/driver/device/pair', { method: 'POST', body: JSON.stringify({ pairingCode }) }),
  disconnectDevice: () => api('/driver/device/disconnect', { method: 'POST' }),
  activity: () => api<ActivitySummary>('/driver/activity/summary'),
  support: (subject: string, description: string) =>
    api('/driver/support/issues', {
      method: 'POST',
      body: JSON.stringify({ subject, description }),
    }),
}

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
      morningSec: number
      afternoonSec: number
      eveningSec: number
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
