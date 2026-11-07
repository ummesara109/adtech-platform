import type { OnboardingStep } from '../../lib/dashboardMetrics'
import { ButtonLink } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { IconCheck } from './DashboardIcons'

type Props = {
  steps: OnboardingStep[]
  kycStatus: string
  canDraft: boolean
}

export function OnboardingChecklist({ steps, kycStatus, canDraft }: Props) {
  const doneCount = steps.filter((step) => step.done).length

  return (
    <Card padding="sm" className="border-auto/30 bg-gradient-to-br from-auto/10 via-card to-card">
      <CardHeader
        title="Welcome to AutoAds"
        description={`Get your Bengaluru auto-rickshaw campaigns ready. KYC · ${kycStatus}`}
      />
      <p className="mb-4 text-sm text-muted">
        {doneCount} of {steps.length} onboarding steps complete. Charts and KPIs stay empty until you have real
        campaigns, payments, and Proof of Play — we never invent numbers.
      </p>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className="flex flex-col gap-2 rounded-xl bg-white/80 px-3 py-3 ring-1 ring-navy/[0.06] sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step.done ? 'bg-teal/15 text-teal' : 'bg-navy/[0.06] text-navy'
                }`}
                aria-hidden
              >
                {step.done ? <IconCheck className="h-4 w-4" /> : index + 1}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${step.done ? 'text-muted line-through' : 'text-navy'}`}>
                  {step.label}
                </p>
              </div>
            </div>
            {!step.done ? (
              <ButtonLink
                to={step.id === 'campaign' && !canDraft ? '/settings' : step.to}
                variant="secondary"
                size="sm"
                className="shrink-0"
              >
                {step.id === 'campaign' && !canDraft ? 'Fix KYC first' : step.action}
              </ButtonLink>
            ) : null}
          </li>
        ))}
      </ol>
    </Card>
  )
}
