import { useEffect, useState } from 'react'
import {
  emptyWorkspaceSnapshot,
  fetchAdvertiserWorkspace,
  type AdvertiserWorkspaceSnapshot,
} from '../api/advertiserWorkspace'
import { ApiError } from '../api/httpClient'
import { useAdvertiser } from '../context/AdvertiserContext'
import {
  loadLocalActivity,
  loadLocalCampaigns,
  loadLocalCreatives,
  loadLocalInvoices,
  loadLocalPayments,
} from '../lib/advertiserRecords'
import { loadAuthSession } from '../lib/authSession'
import { isApiConfigured } from '../lib/config'

type WorkspaceState = {
  data: AdvertiserWorkspaceSnapshot
  loading: boolean
  error: string | null
  /** Soft notice: API configured but session missing, or API offline */
  connectionNotice: string | null
  /** True when dashboard data is sourced from NestJS + Postgres for the signed-in company */
  apiConnected: boolean
  reload: () => void
}

/** Offline / unsigned fallback only — never mixed into an authenticated API workspace. */
function mergeLocal(snapshot: AdvertiserWorkspaceSnapshot, advertiserKey: string): AdvertiserWorkspaceSnapshot {
  const localCampaigns = loadLocalCampaigns(advertiserKey).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    startDate: row.startDate,
    endDate: row.endDate,
    locations: row.locations,
    requestedAutos: row.requestedAutos,
    allocatedAutos: row.allocatedAutos,
    budgetInr: row.budgetInr,
    estimatedReach: row.estimatedReach,
    creativeName: row.creativeName,
    creativeId: row.creativeId,
    approvalStatus: row.approvalStatus,
    deliveryStatus: row.deliveryStatus,
    paymentStatus: row.paymentStatus,
  }))
  const localCreatives = loadLocalCreatives(advertiserKey)
  const localActivity = loadLocalActivity(advertiserKey)
  const localInvoices = loadLocalInvoices(advertiserKey)
  const localPayments = loadLocalPayments(advertiserKey)

  const apiIds = new Set(snapshot.campaigns.map((c) => c.id))
  const mergedCampaigns = [...snapshot.campaigns, ...localCampaigns.filter((c) => !apiIds.has(c.id))]

  const creativeIds = new Set(snapshot.creatives.map((c) => c.id))
  const mergedCreatives = [...snapshot.creatives, ...localCreatives.filter((c) => !creativeIds.has(c.id))]

  const activityIds = new Set(snapshot.activity.map((a) => a.id))
  const mergedActivity = [...snapshot.activity, ...localActivity.filter((a) => !activityIds.has(a.id))].sort(
    (a, b) => b.sortAt - a.sortAt,
  )

  const invoiceIds = new Set(snapshot.invoices.map((row) => row.id))
  const mergedInvoices = [...snapshot.invoices, ...localInvoices.filter((row) => !invoiceIds.has(row.id))]

  const paymentIds = new Set(snapshot.paymentHistory.map((row) => row.id))
  const mergedPayments = [
    ...snapshot.paymentHistory,
    ...localPayments.filter((row) => !paymentIds.has(row.id)),
  ]

  return {
    ...snapshot,
    campaigns: mergedCampaigns,
    creatives: mergedCreatives,
    activity: mergedActivity,
    invoices: mergedInvoices,
    paymentHistory: mergedPayments,
  }
}

export function useAdvertiserWorkspace(): WorkspaceState {
  const { account, profile } = useAdvertiser()
  const advertiserKey = profile.contactEmail || account.companyName || account.fullName
  const [data, setData] = useState<AdvertiserWorkspaceSnapshot>(emptyWorkspaceSnapshot)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null)
  const [apiConnected, setApiConnected] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setConnectionNotice(null)
    setApiConnected(false)

    const run = async () => {
      try {
        if (!isApiConfigured()) {
          if (!cancelled) {
            setData(mergeLocal(emptyWorkspaceSnapshot(), advertiserKey))
            setConnectionNotice(
              'Backend URL is not set. Add VITE_API_BASE_URL=http://localhost:3000 in apps/advertiser-web/.env and restart Vite.',
            )
          }
          return
        }

        if (!loadAuthSession()?.accessToken) {
          if (!cancelled) {
            // Do not show local [TEST] sample rows as if they were production data.
            setData(emptyWorkspaceSnapshot())
            setConnectionNotice(
              'Sign in to load your company workspace from the database. Open Settings → Security and choose a demo advertiser (recommended: live@autoads.test).',
            )
          }
          return
        }

        const snapshot = await fetchAdvertiserWorkspace(advertiserKey)
        if (!cancelled) {
          // Authenticated mode: API/DB only — never merge browser localStorage samples.
          setData(snapshot)
          setApiConnected(true)
          setConnectionNotice(null)
        }
      } catch (err: unknown) {
        if (cancelled) return
        setData(emptyWorkspaceSnapshot())
        setApiConnected(false)

        if (err instanceof ApiError && (err.status === 0 || err.status === 401 || err.status === 403)) {
          setConnectionNotice(
            err.status === 0
              ? 'Cannot reach the AutoAds API. Start Postgres (docker compose up -d) and the API (npm run start:dev in apps/api).'
              : 'Session expired or unauthorized. Sign in again via Settings → Security.',
          )
          setError(null)
          return
        }

        if (err instanceof TypeError) {
          setConnectionNotice(
            'Could not reach NestJS at VITE_API_BASE_URL. Ensure the API is running on port 3000.',
          )
          setError(null)
          return
        }

        setError(err instanceof Error ? err.message : 'Unable to load advertiser workspace from NestJS API.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [advertiserKey, tick])

  return {
    data,
    loading,
    error,
    connectionNotice,
    apiConnected,
    reload: () => setTick((value) => value + 1),
  }
}
