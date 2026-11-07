import { ButtonLink } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { PageLayout } from '../components/ui/PageLayout'
import { TableHead, TableShell, Td, Th } from '../components/ui/TableShell'
import { playbackReports } from '../data/dashboard'
import { formatInr, formatNumber } from '../lib/format'

export function PlaybackReportsPage() {
  return (
    <PageLayout>
      <PageHeader
        title="Playback reports"
        description="Campaign-level summaries: starts, completions, interruptions, hours, and expenditure."
        actions={
          <>
            <ButtonLink to="/performance" variant="secondary">
              Live performance
            </ButtonLink>
            <ButtonLink to="/campaigns" variant="outline">
              Campaigns
            </ButtonLink>
          </>
        }
      />

      <Card padding="sm">
        <TableShell minWidth="960px">
          <TableHead>
            <tr>
              <Th>Campaign</Th>
              <Th>Period</Th>
              <Th>Targeted</Th>
              <Th>Active</Th>
              <Th>Starts</Th>
              <Th>Completed</Th>
              <Th>Interrupted</Th>
              <Th>Rate</Th>
              <Th>Hours</Th>
              <Th>Spend</Th>
              <Th>Actions</Th>
            </tr>
          </TableHead>
          <tbody>
            {playbackReports.map((row) => (
              <tr key={row.campaignId} className="transition hover:bg-paper/80">
                <Td>
                  <p className="font-semibold text-navy">{row.campaignName}</p>
                  <p className="font-mono text-xs text-muted">{row.campaignId}</p>
                </Td>
                <Td className="text-muted">{row.period}</Td>
                <Td className="tabular-nums">{formatNumber(row.targetedDevices)}</Td>
                <Td className="tabular-nums">{formatNumber(row.activeDevices)}</Td>
                <Td className="tabular-nums">{formatNumber(row.playbackStarts)}</Td>
                <Td className="tabular-nums font-medium text-navy">{formatNumber(row.completedPlays)}</Td>
                <Td className="tabular-nums text-muted">{formatNumber(row.interruptedPlays)}</Td>
                <Td className="tabular-nums">{row.completionRate}%</Td>
                <Td className="tabular-nums">{formatNumber(row.runningHours)}</Td>
                <Td className="font-semibold tabular-nums text-navy">{formatInr(row.expenditureInr)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <ButtonLink to={`/campaigns/${row.campaignId}`} variant="secondary" size="sm">
                      View
                    </ButtonLink>
                    <ButtonLink to="/performance" variant="outline" size="sm">
                      Live
                    </ButtonLink>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Card>
    </PageLayout>
  )
}
