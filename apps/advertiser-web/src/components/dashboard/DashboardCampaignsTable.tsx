import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../api/httpClient'
import { useAdvertiser } from '../../context/AdvertiserContext'
import { duplicateCampaign, updateCampaignStatus } from '../../lib/advertiserRecords'
import { permittedCampaignActions } from '../../lib/campaignLifecycle'
import { loadAuthSession } from '../../lib/authSession'
import { isApiConfigured } from '../../lib/config'
import { formatInr, formatNumber } from '../../lib/format'
import { campaignStatusClass } from '../../lib/statusStyles'
import type { CampaignRow, CampaignStatus } from '../../types/advertiser'
import { Button, ButtonLink } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { LIFECYCLE_STATUSES } from '../../lib/campaignLifecycle'

type Row = CampaignRow & {
  approvalStatus?: string
  deliveryStatus?: string
  creativeName?: string
}

type Props = {
  campaigns: Row[]
  onChanged: () => void
  canDraft: boolean
}

type SortKey = 'name' | 'startDate' | 'endDate' | 'budgetInr' | 'status'
type ConfirmAction = { type: 'pause' | 'resume' | 'cancel' | 'duplicate'; campaign: Row }

const PAGE_SIZE = 5

export function DashboardCampaignsTable({ campaigns, onChanged, canDraft }: Props) {
  const { account } = useAdvertiser()
  const advertiserKey = account.companyName || account.fullName
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | CampaignStatus>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const filtered = useMemo(() => {
    const rows = campaigns.filter((campaign) => {
      const haystack = `${campaign.id} ${campaign.name} ${campaign.creativeName ?? ''} ${campaign.locations.join(' ')}`.toLowerCase()
      if (query && !haystack.includes(query.toLowerCase())) return false
      if (status !== 'all' && campaign.status !== status) return false
      if (from && campaign.startDate && campaign.startDate < from) return false
      if (to && campaign.endDate && campaign.endDate > to) return false
      return true
    })

    rows.sort((a, b) => {
      const left = a[sortKey] ?? ''
      const right = b[sortKey] ?? ''
      const cmp = String(left).localeCompare(String(right), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [campaigns, query, status, from, to, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  async function runAction() {
    if (!confirm) return
    setBusy(true)
    try {
      const { campaign, type } = confirm
      if (isApiConfigured() && loadAuthSession()?.accessToken) {
        await apiRequest(`/api/v1/advertiser/campaigns/${campaign.id}/${type}`, { method: 'POST' })
      } else if (type === 'duplicate') {
        duplicateCampaign(advertiserKey, campaign.id)
      } else if (type === 'pause') {
        updateCampaignStatus(advertiserKey, campaign.id, 'Paused')
      } else if (type === 'resume') {
        updateCampaignStatus(advertiserKey, campaign.id, 'Live')
      } else if (type === 'cancel') {
        updateCampaignStatus(advertiserKey, campaign.id, 'Cancelled')
      }
      setToast(
        type === 'duplicate'
          ? `Duplicated ${campaign.name}`
          : type === 'pause'
            ? `Paused ${campaign.name}`
            : type === 'resume'
              ? `Resumed ${campaign.name}`
              : `Cancelled ${campaign.name}`,
      )
      setConfirm(null)
      onChanged()
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <label className="min-w-[12rem] flex-1 text-xs font-semibold text-muted">
          Search
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(0)
            }}
            placeholder="ID, name, creative, location"
            className="mt-1 w-full rounded-xl border border-navy/12 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-teal"
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Status
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as 'all' | CampaignStatus)
              setPage(0)
            }}
            className="mt-1 block w-full rounded-xl border border-navy/12 bg-white px-3 py-2 text-sm text-navy"
          >
            <option value="all">All</option>
            {LIFECYCLE_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Start from
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value)
              setPage(0)
            }}
            className="mt-1 block rounded-xl border border-navy/12 bg-white px-3 py-2 text-sm text-navy"
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          End to
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value)
              setPage(0)
            }}
            className="mt-1 block rounded-xl border border-navy/12 bg-white px-3 py-2 text-sm text-navy"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No campaigns match"
          description="Create a campaign or clear filters. New advertisers see an empty list until the first draft is saved."
          action={
            canDraft ? (
              <ButtonLink to="/campaigns/create" size="sm">
                Create campaign
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="border-b border-navy/[0.08] text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-3">
                    <button type="button" className="font-semibold" onClick={() => toggleSort('name')}>
                      Campaign
                    </button>
                  </th>
                  <th className="py-2 pr-3">Creative</th>
                  <th className="py-2 pr-3">Locations</th>
                  <th className="py-2 pr-3">Allocated</th>
                  <th className="py-2 pr-3">
                    <button type="button" className="font-semibold" onClick={() => toggleSort('startDate')}>
                      Start
                    </button>
                  </th>
                  <th className="py-2 pr-3">
                    <button type="button" className="font-semibold" onClick={() => toggleSort('endDate')}>
                      End
                    </button>
                  </th>
                  <th className="py-2 pr-3">
                    <button type="button" className="font-semibold" onClick={() => toggleSort('budgetInr')}>
                      Budget
                    </button>
                  </th>
                  <th className="py-2 pr-3">Approval</th>
                  <th className="py-2 pr-3">Delivery</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/[0.06]">
                {pageRows.map((campaign) => {
                  const actions = permittedCampaignActions(campaign.status)
                  return (
                    <tr key={campaign.id} className="align-top">
                      <td className="py-3 pr-3">
                        <Link to={`/campaigns/${campaign.id}`} className="font-semibold text-navy hover:text-teal">
                          {campaign.name}
                        </Link>
                        <p className="font-mono text-xs text-muted">{campaign.id}</p>
                      </td>
                      <td className="max-w-[120px] truncate py-3 pr-3 text-muted" title={campaign.creativeName}>
                        {campaign.creativeName || '—'}
                      </td>
                      <td className="max-w-[140px] truncate py-3 pr-3 text-muted" title={campaign.locations.join(', ')}>
                        {campaign.locations.join(', ') || '—'}
                      </td>
                      <td className="py-3 pr-3 tabular-nums text-navy">{formatNumber(campaign.allocatedAutos)}</td>
                      <td className="py-3 pr-3 text-muted">{campaign.startDate || '—'}</td>
                      <td className="py-3 pr-3 text-muted">{campaign.endDate || '—'}</td>
                      <td className="py-3 pr-3 tabular-nums text-navy">
                        {campaign.budgetInr ? formatInr(campaign.budgetInr) : '—'}
                      </td>
                      <td className="py-3 pr-3">
                        <span className={campaignStatusClass(campaign.status)}>
                          {campaign.approvalStatus || campaign.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={campaignStatusClass(campaign.status)}>
                          {campaign.deliveryStatus || 'Not started'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <ButtonLink to={`/campaigns/${campaign.id}`} variant="secondary" size="sm">
                            View
                          </ButtonLink>
                          {actions.edit ? (
                            <ButtonLink to="/campaigns/create" size="sm">
                              Edit
                            </ButtonLink>
                          ) : null}
                          {actions.duplicate ? (
                            <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'duplicate', campaign })}>
                              Duplicate
                            </Button>
                          ) : null}
                          {actions.pause ? (
                            <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'pause', campaign })}>
                              Pause
                            </Button>
                          ) : null}
                          {actions.resume ? (
                            <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'resume', campaign })}>
                              Resume
                            </Button>
                          ) : null}
                          {actions.cancel ? (
                            <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'cancel', campaign })}>
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm text-muted">
            <p>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {toast ? <p className="text-sm font-medium text-teal">{toast}</p> : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.type === 'cancel'
            ? 'Cancel campaign?'
            : confirm?.type === 'pause'
              ? 'Pause campaign?'
              : confirm?.type === 'resume'
                ? 'Resume campaign?'
                : 'Duplicate campaign?'
        }
        description={
          confirm
            ? `${confirm.campaign.name} (${confirm.campaign.id}) will be ${confirm.type === 'duplicate' ? 'copied as a new Draft' : confirm.type + 'd'}.`
            : ''
        }
        confirmLabel={confirm?.type === 'cancel' ? 'Cancel campaign' : 'Confirm'}
        danger={confirm?.type === 'cancel'}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void runAction()}
      />
    </div>
  )
}
