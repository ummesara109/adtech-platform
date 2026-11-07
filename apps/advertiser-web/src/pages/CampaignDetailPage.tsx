import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiRequest } from '../api/httpClient'
import { postCampaignAction } from '../api/campaignsApi'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { PageLayout } from '../components/ui/PageLayout'
import { Timeline } from '../components/ui/Timeline'
import { permittedCampaignActions } from '../lib/campaignLifecycle'
import { isApiConfigured } from '../lib/config'
import { loadAuthSession } from '../lib/authSession'
import { formatInr, formatNumber } from '../lib/format'
import { campaignStatusClass } from '../lib/statusStyles'
import type { CampaignRow, CampaignStatus } from '../types/advertiser'

type CampaignDetail = CampaignRow & {
  description?: string
  timeline: {
    id: string
    previousStatus: string | null
    status: string
    note: string
    actorLabel: string
    at: string
    atDisplay: string
  }[]
}

export function CampaignDetailPage() {
  const { id } = useParams()
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionNote, setActionNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    if (!isApiConfigured() || !loadAuthSession()?.accessToken) {
      setLoading(false)
      setError('Sign in with the API configured to view campaign details from the database.')
      setCampaign(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const row = await apiRequest<CampaignDetail>(`/api/v1/advertiser/campaigns/${id}`)
      setCampaign(row)
    } catch (err) {
      setCampaign(null)
      setError(err instanceof Error ? err.message : 'Campaign not found')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function runAction(action: 'pause' | 'resume' | 'cancel') {
    if (!campaign) return
    setBusy(true)
    setActionNote(null)
    try {
      await postCampaignAction(campaign.id, action)
      setActionNote(`Campaign ${action} recorded. Status event saved in the database.`)
      await load()
    } catch (err) {
      setActionNote(err instanceof Error ? err.message : `Could not ${action}`)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="skeleton h-40 rounded-2xl" aria-busy="true" />
      </PageLayout>
    )
  }

  if (!campaign) {
    return (
      <PageLayout>
        <Card>
          <p className="font-semibold text-navy">Campaign not found</p>
          <p className="mt-2 text-sm text-muted">
            {error ||
              'This campaign is not in your advertiser-scoped company. Only campaigns belonging to your company appear here.'}
          </p>
          <ButtonLink to="/campaigns" variant="ghost" className="mt-4">
            Back to campaigns
          </ButtonLink>
        </Card>
      </PageLayout>
    )
  }

  const actions = permittedCampaignActions(campaign.status)
  const timeline = campaign.timeline ?? []

  const stats = [
    {
      label: 'Duration',
      value:
        campaign.startDate && campaign.endDate ? `${campaign.startDate} → ${campaign.endDate}` : 'Not configured',
    },
    { label: 'Bengaluru locations', value: campaign.locations.join(', ') || '—' },
    { label: 'Requested autos', value: formatNumber(campaign.requestedAutos) },
    {
      label: 'Allocated auto-rickshaws',
      value:
        campaign.allocatedAutos > 0
          ? formatNumber(campaign.allocatedAutos)
          : '0 · allocation not completed (requested ≠ delivered)',
    },
    { label: 'Budget', value: campaign.budgetInr ? formatInr(campaign.budgetInr) : '—' },
    {
      label: 'Creative',
      value: campaign.creativeName || '—',
    },
  ]

  return (
    <PageLayout>
      <PageHeader
        backTo={{ label: 'Campaigns', href: '/campaigns' }}
        title={campaign.name}
        description={`${campaign.id} · Auto-rickshaw screen campaign`}
        actions={
          <>
            <span className={campaignStatusClass(campaign.status)}>{campaign.status}</span>
            {actions.pause ? (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => void runAction('pause')}>
                Pause
              </Button>
            ) : null}
            {actions.resume ? (
              <Button size="sm" disabled={busy} onClick={() => void runAction('resume')}>
                Resume
              </Button>
            ) : null}
            {campaign.status === 'Draft' ? (
              <ButtonLink to="/campaigns/create" size="sm">
                Continue setup
              </ButtonLink>
            ) : null}
          </>
        }
      />

      {actionNote ? <p className="text-sm font-medium text-teal">{actionNote}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} padding="sm" className="!p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{stat.label}</p>
            <p className="mt-1 text-sm font-semibold text-navy">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Campaign timeline"
          description="Database audit events for this campaign. Events are created only on real status transitions."
        />
        {timeline.length === 0 ? (
          <p className="text-sm text-muted">No status events recorded for this campaign yet.</p>
        ) : (
          <Timeline
            items={timeline.map((event) => ({
              id: event.id,
              title: event.status,
              meta: (
                <span className="text-xs text-muted">
                  {event.atDisplay}
                  {event.previousStatus ? ` · ${event.previousStatus} → ${event.status}` : ''}
                  {event.actorLabel ? ` · ${event.actorLabel}` : ''}
                </span>
              ),
              body: event.note,
              badge: (
                <span className={campaignStatusClass(event.status as CampaignStatus)}>{event.status}</span>
              ),
            }))}
          />
        )}
      </Card>
    </PageLayout>
  )
}
