import { KpiCard } from '../components/KpiCard'
import { PlaybackTrend } from '../components/PlaybackTrend'
import { ButtonLink } from '../components/ui/Button'
import { Callout } from '../components/ui/Callout'
import { Card, CardHeader } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { PageLayout } from '../components/ui/PageLayout'
import { ProgressBar } from '../components/ui/ProgressBar'
import { advertiserAnalytics, geographicDistribution, livePerformanceTrend, measurementNote } from '../data/dashboard'
import { formatInr, formatNumber } from '../lib/format'

export function PerformancePage() {
  const maxLocationPlays = Math.max(...geographicDistribution.map((row) => row.completedPlays), 1)

  return (
    <PageLayout>
      <PageHeader
        title="Live performance"
        description="Delivery metrics for active campaigns: devices, playback, completion, geography, and spend."
        actions={
          <>
            <ButtonLink to="/playback-reports" variant="secondary">
              Playback reports
            </ButtonLink>
            <ButtonLink to="/campaigns" variant="outline">
              Campaigns
            </ButtonLink>
            <ButtonLink to="/campaigns/create">Create campaign</ButtonLink>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Targeted devices" value={formatNumber(advertiserAnalytics.totalTargetedDevices)} accent="navy" />
        <KpiCard label="Active devices" value={formatNumber(advertiserAnalytics.activeDevices)} />
        <KpiCard label="Playback starts" value={formatNumber(advertiserAnalytics.playbackStarts)} />
        <KpiCard label="Completed ads" value={formatNumber(advertiserAnalytics.completedAdvertisements)} />
        <KpiCard label="Interrupted ads" value={formatNumber(advertiserAnalytics.interruptedAdvertisements)} accent="auto" />
        <KpiCard label="Completion rate" value={`${advertiserAnalytics.playbackCompletionRate}%`} />
        <KpiCard label="Running hours" value={formatNumber(advertiserAnalytics.campaignRunningHours)} />
        <KpiCard label="Expenditure" value={formatInr(advertiserAnalytics.campaignExpenditureInr)} accent="navy" />
      </div>

      <PlaybackTrend points={livePerformanceTrend} />

      <Card>
        <CardHeader title="Geographic distribution" description="Completed plays by targeted area" />
        <ul className="space-y-4">
          {geographicDistribution.map((row) => (
            <ProgressBar
              key={row.area}
              label={row.area}
              value={row.completedPlays}
              max={maxLocationPlays}
              sublabel={`${formatNumber(row.completedPlays)} · ${formatNumber(row.targetedDevices)} devices`}
            />
          ))}
        </ul>
      </Card>

      <Callout variant="measurement">{measurementNote}</Callout>
    </PageLayout>
  )
}
