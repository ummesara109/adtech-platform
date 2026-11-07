import { ButtonLink } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { PageLayout } from '../components/ui/PageLayout'
import { verificationRecord } from '../data/profile'
import { verificationClass } from '../lib/statusStyles'

const docStatusClass: Record<string, string> = {
  Submitted: 'rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700',
  Approved: 'rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800',
  Rejected: 'rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800',
  Required: 'rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900',
}

export function VerificationPage() {
  return (
    <PageLayout>
      <PageHeader
        title="Advertiser verification"
        description="KYC and business verification. Campaigns enter admin review only after verification policy is satisfied."
        actions={
          <>
            <ButtonLink to="/profile" variant="secondary">
              Company profile
            </ButtonLink>
            <ButtonLink to="/campaigns/create">Create campaign</ButtonLink>
          </>
        }
      />

      <Card className="border-teal/15 bg-gradient-to-br from-card to-teal-muted/30">
        <div className="flex flex-wrap items-center gap-3">
          <span className={verificationClass(verificationRecord.status)}>{verificationRecord.status}</span>
          <span className="text-sm text-muted">Submitted {verificationRecord.submittedOn}</span>
          {verificationRecord.reviewedOn ? (
            <span className="text-sm text-muted">· Reviewed {verificationRecord.reviewedOn}</span>
          ) : null}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-navy/80">{verificationRecord.notes}</p>
      </Card>

      <Card>
        <CardHeader title="Submitted documents" description="Status per KYC artifact" />
        <ul className="divide-y divide-navy/[0.06]">
          {verificationRecord.documents.map((doc) => (
            <li key={doc.label} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <span className="text-sm font-medium text-navy">{doc.label}</span>
              <span className={docStatusClass[doc.status]}>{doc.status}</span>
            </li>
          ))}
        </ul>
      </Card>
    </PageLayout>
  )
}
