import { ButtonLink } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { PageLayout } from '../components/ui/PageLayout'
import { advertiserAccount } from '../data/dashboard'
import { companyProfile } from '../data/profile'

export function ProfilePage() {
  const fields: { label: string; value: string }[] = [
    { label: 'Registered on', value: companyProfile.registeredOn },
    { label: 'Legal name', value: companyProfile.legalName },
    { label: 'Trade / brand name', value: companyProfile.tradeName },
    { label: 'Business type', value: companyProfile.businessType },
    { label: 'Industry', value: companyProfile.industry },
    { label: 'GSTIN', value: companyProfile.gstin },
    { label: 'Registered address', value: companyProfile.registeredAddress },
    { label: 'City', value: companyProfile.city },
    { label: 'Primary contact', value: companyProfile.contactName },
    { label: 'Email', value: companyProfile.contactEmail },
    { label: 'Phone', value: companyProfile.contactPhone },
  ]

  return (
    <PageLayout>
      <PageHeader
        title="Company profile"
        description={`Registration and company details for ${advertiserAccount.companyName}. Updates may require re-verification before new campaigns are approved.`}
        actions={
          <>
            <ButtonLink to="/verification" variant="secondary">
              Verification
            </ButtonLink>
            <ButtonLink to="/campaigns/create">Create campaign</ButtonLink>
          </>
        }
      />

      <Card>
        <CardHeader title="Organization record" description="Linked to advertiser ID on all campaigns" />
        <dl className="grid gap-5 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label} className="rounded-xl bg-paper/60 px-4 py-3 ring-1 ring-navy/[0.04]">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{field.label}</dt>
              <dd className="mt-1 text-sm font-semibold text-navy">{field.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </PageLayout>
  )
}
