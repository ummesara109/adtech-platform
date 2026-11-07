import { ButtonLink } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { PageLayout } from '../components/ui/PageLayout'
import { useWorkspace } from '../context/AdvertiserWorkspaceContext'

export function NotificationsPage() {
  const { data, loading } = useWorkspace()

  return (
    <PageLayout>
      <PageHeader
        title="Notifications"
        description="Campaign status, creative moderation, payment, and KYC alerts for this advertiser."
        actions={
          <ButtonLink to="/campaigns" variant="secondary">
            Campaigns
          </ButtonLink>
        }
      />

      <Card padding="none">
        {loading ? (
          <div className="skeleton m-5 h-32" />
        ) : data.notifications.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No notifications"
              description="Approval updates, Proof of Play activation, and billing events from NestJS will appear here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-navy/[0.06]">
            {data.notifications.map((item) => (
              <li key={item.id} className={`px-5 py-4 ${item.read ? '' : 'bg-teal-muted/20'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{item.category}</p>
                    <p className={`mt-1 text-sm ${item.read ? 'font-medium text-navy' : 'font-bold text-navy'}`}>
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-muted">{item.body}</p>
                    <p className="mt-1 text-xs text-muted">{item.at}</p>
                  </div>
                  {item.read ? null : <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal" aria-label="Unread" />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageLayout>
  )
}
