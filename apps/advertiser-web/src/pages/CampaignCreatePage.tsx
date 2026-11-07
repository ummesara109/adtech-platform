import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { inputClass, labelClass } from '../components/wizard/fieldStyles'
import { CampaignWizardSummary } from '../components/wizard/CampaignWizardSummary'
import { CreativeUploadStep } from '../components/wizard/CreativeUploadStep'
import { LocationAvailabilityPanel } from '../components/wizard/LocationAvailabilityPanel'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { PageLayout } from '../components/ui/PageLayout'
import { WizardStepper } from '../components/ui/WizardStepper'
import { apiRequest } from '../api/httpClient'
import { useAdvertiser } from '../context/AdvertiserContext'
import { useWorkspace } from '../context/AdvertiserWorkspaceContext'
import { emptyDraft, objectiveMeta, wizardSteps } from '../data/campaignWizard'
import { clearStoredDraft, loadStoredDraft, saveStoredDraft } from '../lib/campaignDraft'
import { campaignDayCount, estimatedCampaignReach, operatingHoursPerDay } from '../lib/campaignQuote'
import {
  canCreateCampaignDraft,
  canSubmitForApproval,
  resolveAdvertiserLaunchStatus,
  verificationAccessMessage,
} from '../lib/access'
import { upsertCampaignFromDraft } from '../lib/advertiserRecords'
import { persistCreativeToLibrary } from '../lib/creativeLibrary'
import { loadAuthSession } from '../lib/authSession'
import { assertOperatingHoursValid, validateOperatingHours, validateStep } from '../lib/campaignValidation'
import { isApiConfigured } from '../lib/config'
import { formatInr, formatNumber } from '../lib/format'
import { formatFileSize } from '../lib/imageOptimization'
import type { CampaignDraft, CampaignObjective, WizardStepId } from '../types/campaignWizard'
import { campaignObjectives } from '../types/campaignWizard'
function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">{title}</h3>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>
    </div>
  )
}

function CollapsibleDetails({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl border border-navy/[0.06] bg-paper/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-navy"
        aria-expanded={open}
      >
        {title}
        <span className="text-muted">{open ? '−' : '+'}</span>
      </button>
      {open ? <div className="border-t border-navy/[0.06] px-4 pb-4 pt-2">{children}</div> : null}
    </div>
  )
}

export function CampaignCreatePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { account, profile } = useAdvertiser()
  const { data: workspace, reload: reloadWorkspace } = useWorkspace()
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const stored = loadStoredDraft()
  const [step, setStep] = useState<WizardStepId>(() => {
    const raw = stored?.step ?? 1
    return raw <= 1 ? 1 : raw >= 3 ? 3 : (raw as WizardStepId)
  })
  const [draft, setDraft] = useState<CampaignDraft>(() => {
    const base = emptyDraft()
    return stored?.draft ? { ...base, ...stored.draft, creative: stored.draft.creative ?? null } : base
  })
  const [errors, setErrors] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const canDraft = canCreateCampaignDraft(account.verificationStatus)
  const canSubmit = canSubmitForApproval(account.verificationStatus)
  const advertiserKey = profile.contactEmail || account.companyName || account.fullName

  /** Deep-link from Creative Library: /campaigns/create?creativeId=… */
  useEffect(() => {
    const creativeId = searchParams.get('creativeId')
    if (!creativeId) return
    const asset = workspace.creatives.find((row) => row.id === creativeId)
    if (!asset) return
    const nextFormat = asset.type === 'Video' ? ('Video' as const) : ('Static image' as const)
    setDraft((current) => ({
      ...current,
      format: nextFormat,
      creative: {
        id: asset.id,
        fileName: asset.name,
        format: nextFormat,
        sizeBytes: asset.sizeBytes ?? 0,
        durationSeconds: nextFormat === 'Video' ? current.adDurationSeconds : null,
        previewUrl: asset.previewUrl || '',
        moderationStatus:
          asset.status === 'Approved'
            ? 'Approved'
            : asset.status === 'Revision Required'
              ? 'Revision Required'
              : asset.status === 'Pending moderation'
                ? 'Pending moderation'
                : 'Draft',
        optimization: null,
      },
    }))
    setStep(1)
    const next = new URLSearchParams(searchParams)
    next.delete('creativeId')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, workspace.creatives])

  const reach = useMemo(() => estimatedCampaignReach(draft), [draft])
  const days = useMemo(() => campaignDayCount(draft), [draft])
  const operatingHoursError = useMemo(
    () => validateOperatingHours(draft.operatingStart, draft.operatingEnd),
    [draft.operatingStart, draft.operatingEnd],
  )
  const hoursInvalid = operatingHoursError != null
  const continueDisabled = step === 2 && hoursInvalid
  const submitBlockers = useMemo(() => {
    if (step !== 3) return [] as string[]
    const blockers: string[] = []
    if (!canSubmit) blockers.push(verificationAccessMessage(account.verificationStatus))
    if (!confirmSubmit) blockers.push('Confirm below before submitting for admin review.')
    return blockers
  }, [step, canSubmit, account.verificationStatus, draft.campaignBudgetInr, confirmSubmit])

  function patch(partial: Partial<CampaignDraft>) {
    setDraft((current) => ({ ...current, ...partial }))
    setErrors([])
    setDraftSaved(false)
  }

  function goNext() {
    const stepErrors = validateStep(step, draft)
    if (stepErrors.length) {
      setErrors(stepErrors)
      return
    }
    try {
      assertOperatingHoursValid(draft)
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Invalid operating hours.'])
      return
    }
    if (step === 3) {
      const blockers: string[] = []
      if (!canSubmit) blockers.push(verificationAccessMessage(account.verificationStatus))
      if (!confirmSubmit) blockers.push('Confirm that the campaign details are correct before submitting.')
      if (blockers.length) {
        setErrors(blockers)
        return
      }
      saveStoredDraft(draft, step)
      void finalizeCampaign('Submitted')
      return
    }
    saveStoredDraft(draft, step)
    setStep((current) => Math.min(3, current + 1) as WizardStepId)
  }

  async function finalizeCampaign(mode: 'Draft' | 'Submitted') {
    let creativeId: string | null = draft.creative?.id ?? null
    // Only touch the shared library when the creative already has a library id (saved earlier).
    // Campaign-only uploads (id null) stay off the Creative Library list.
    if (draft.creative?.id) {
      const saved = await persistCreativeToLibrary({
        advertiserKey,
        fileName: draft.creative.fileName,
        type: draft.format === 'Video' ? 'Video' : 'Image',
        sizeBytes: draft.creative.sizeBytes,
        previewUrl: draft.creative.previewUrl,
        mimeType: draft.creative.mimeType,
        width: draft.creative.width,
        height: draft.creative.height,
        existingId: draft.creative.id,
        campaignName: draft.name,
      })
      creativeId = saved.id
    }

    const descriptionPayload = [
      draft.objective ? `Objective: ${draft.objective}` : '',
      draft.description,
      draft.landingPageUrl ? `Landing page: ${draft.landingPageUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const launchStatus =
      mode === 'Submitted'
        ? resolveAdvertiserLaunchStatus(draft.startDate, draft.endDate)
        : ('Draft' as const)

    upsertCampaignFromDraft(
      advertiserKey,
      { ...draft, description: descriptionPayload },
      {
        status: launchStatus,
        creativeId,
      },
    )
    reloadWorkspace()

    if (isApiConfigured() && loadAuthSession()?.accessToken) {
      try {
        await apiRequest('/api/v1/advertiser/campaigns', {
          method: 'POST',
          body: {
            name: draft.name,
            description: descriptionPayload,
            locations: draft.locations,
            selectedScreenIds: draft.selectedScreenIds,
            requestedAutos: draft.requestedAutos,
            startDate: draft.startDate || undefined,
            endDate: draft.endDate || undefined,
            operatingStart: draft.operatingStart,
            operatingEnd: draft.operatingEnd,
            daysOfWeek: draft.daysOfWeek,
            frequencyCap: draft.frequencyCap,
            campaignBudgetInr: draft.campaignBudgetInr,
            creativeId: creativeId || undefined,
            submitMode: mode,
          },
        })
      } catch (error) {
        setErrors([error instanceof Error ? error.message : 'Could not sync campaign. Your draft is saved locally.'])
        if (mode === 'Submitted') return
      }
    }

    if (mode === 'Submitted') {
      setSubmitted(true)
      clearStoredDraft()
    }
  }

  function saveDraft() {
    try {
      assertOperatingHoursValid(draft)
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Invalid operating hours.'])
      setDraftSaved(false)
      return
    }
    saveStoredDraft(draft, step)
    void finalizeCampaign('Draft').then(() => setDraftSaved(true))
  }

  function goBack() {
    setErrors([])
    setConfirmSubmit(false)
    setStep((current) => Math.max(1, current - 1) as WizardStepId)
  }

  function goToStep(target: WizardStepId) {
    if (target >= step) return
    setErrors([])
    setConfirmSubmit(false)
    setStep(target)
  }

  if (!canDraft) {
    return (
      <PageLayout className="max-w-lg">
        <Card>
          <h2 className="text-xl font-bold text-navy">Campaign creation locked</h2>
          <p className="mt-2 text-sm text-muted">{verificationAccessMessage(account.verificationStatus)}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink to="/settings">Update KYC documents</ButtonLink>
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          </div>
        </Card>
      </PageLayout>
    )
  }

  if (submitted) {
    return (
      <PageLayout className="max-w-lg">
        <Card className="animate-fade-in-up border-teal/20 bg-gradient-to-br from-card to-teal-muted/40 text-center sm:text-left">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal text-2xl text-white sm:mx-0">
            ✓
          </div>
          <h2 className="text-xl font-bold text-navy">Campaign submitted</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            <span className="font-semibold text-navy">{draft.name}</span> is saved for your company. Submitting does not
            mean admin approval or live playback — check Campaigns for status. Live fleet delivery is not claimed until
            devices are connected.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start">
            <ButtonLink to="/campaigns">View campaigns</ButtonLink>
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          </div>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout className="max-w-6xl !space-y-5">
      <PageHeader
        backTo={{ label: 'Campaigns', href: '/campaigns' }}
        title="Create campaign"
        description="Three simple stages: your ad, audience & schedule (including budget), then review and submit."
      />

      {!canSubmit ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {verificationAccessMessage(account.verificationStatus)} Final submission stays locked until KYC is Verified
          (API mode). You can still save drafts.
        </p>
      ) : null}

      <WizardStepper steps={wizardSteps} current={step} />

      <div className="lg:hidden">
        <CampaignWizardSummary draft={draft} compact onEditStep={goToStep} />
      </div>

      <div
        className={`grid gap-5 ${
          step === 3 ? 'lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px]' : 'lg:grid-cols-[minmax(0,1fr)_280px]'
        }`}
      >
        <Card
          padding="sm"
          className={`animate-fade-in-up overflow-hidden sm:p-6 ${step === 3 ? '!border-0 !bg-transparent !p-0 !shadow-none' : ''}`}
          key={step}
        >
          {step === 1 ? (
            <div className="space-y-6">
              <StepHeading
                title="Stage 1 — Create Your Ad"
                subtitle="Name your campaign, pick an objective, and attach the image or video that will play on screens."
              />

              <div>
                <label className={labelClass} htmlFor="wizard-campaign-name">
                  Campaign name
                </label>
                <input
                  id="wizard-campaign-name"
                  className={inputClass}
                  placeholder="e.g. Koramangala weekend launch"
                  value={draft.name}
                  onChange={(event) => patch({ name: event.target.value })}
                  autoFocus
                />
              </div>

              <div>
                <p className={labelClass}>Campaign objective</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {campaignObjectives.map((objective) => {
                    const meta = objectiveMeta[objective]
                    const selected = draft.objective === objective
                    return (
                      <button
                        key={objective}
                        type="button"
                        onClick={() => patch({ objective: objective as CampaignObjective })}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selected
                            ? 'border-auto bg-auto/10 shadow-sm ring-2 ring-auto/30'
                            : 'border-navy/10 bg-white hover:border-navy/20 hover:shadow-sm'
                        }`}
                      >
                        <span className="text-lg text-navy" aria-hidden>
                          {meta?.icon}
                        </span>
                        <p className="mt-2 font-semibold text-navy">{objective}</p>
                        <p className="mt-1 text-xs text-muted">{meta?.blurb}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <CollapsibleDetails title="Optional: description & landing page">
                <div className="grid gap-4 pt-2">
                  <div>
                    <label className={labelClass} htmlFor="wizard-desc">
                      Short description <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <textarea
                      id="wizard-desc"
                      rows={3}
                      className={inputClass}
                      placeholder="What should drivers and reviewers know?"
                      value={draft.description}
                      onChange={(event) => patch({ description: event.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="wizard-landing">
                      Landing page <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <input
                      id="wizard-landing"
                      className={inputClass}
                      placeholder="https://"
                      value={draft.landingPageUrl}
                      onChange={(event) => patch({ landingPageUrl: event.target.value })}
                    />
                  </div>
                </div>
              </CollapsibleDetails>

              <div className="rounded-2xl border border-navy/[0.08] bg-gradient-to-br from-white to-paper/80 p-1 shadow-[var(--shadow-card)]">
                <CreativeUploadStep
                  draft={draft}
                  library={workspace.creatives}
                  onPatch={patch}
                  onValidationError={setErrors}
                  onLibraryChanged={reloadWorkspace}
                  embedded
                />
              </div>

              <div className="flex flex-wrap gap-2 border-t border-navy/[0.06] pt-5">
                <Button onClick={goNext}>Continue to Audience &amp; Schedule</Button>
                <Button variant="ghost" onClick={saveDraft} disabled={hoursInvalid}>
                  Save as Draft
                </Button>
                {draftSaved ? <span className="self-center text-xs font-medium text-teal">Draft saved</span> : null}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-6">
              <StepHeading
                title="Stage 2 — Choose Audience & Schedule"
                subtitle="Select Bengaluru areas, how many autos you want, when ads run, and playback settings."
              />

              <div className="rounded-2xl border border-teal/20 bg-teal-muted/20 px-4 py-3 text-sm text-navy">
                <p className="font-semibold">Live summary</p>
                <p className="mt-1 text-muted">
                  {draft.locations.length ? draft.locations.join(', ') : 'No locations yet'}
                  {' · '}
                  {formatNumber(draft.requestedAutos)} autos requested
                  {' · '}
                  {draft.startDate && draft.endDate
                    ? `${draft.startDate} → ${draft.endDate} (${days} day${days === 1 ? '' : 's'})`
                    : 'Set schedule'}
                  {' · '}
                  {draft.operatingStart}–{draft.operatingEnd} ({operatingHoursPerDay(draft).toFixed(1)} hrs/day)
                  {' · '}
                  {draft.adDurationSeconds}s spot · {draft.frequencyCap} plays/device/day
                </p>
              </div>

              <LocationAvailabilityPanel draft={draft} onPatch={patch} />

              <Card padding="sm" className="!p-5">
                <div>
                  <label className={labelClass} htmlFor="wizard-budget-stage2">
                    Committed campaign budget (INR)
                  </label>
                  <input
                    id="wizard-budget-stage2"
                    type="number"
                    min={1}
                    className={inputClass}
                    placeholder="Enter budget for this campaign"
                    value={draft.campaignBudgetInr || ''}
                    onChange={(event) => patch({ campaignBudgetInr: Number(event.target.value) })}
                  />
                  <p className="mt-1.5 text-xs text-muted">
                    You&apos;ll review this amount on the next step — it won&apos;t be entered again. Taxes and final
                    invoice totals follow platform billing.
                  </p>
                </div>
                {draft.campaignBudgetInr > 0 ? (
                  <div className="mt-4 rounded-xl border border-navy/[0.06] bg-paper/70 px-4 py-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Estimated reach (modelled)</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-navy">{formatNumber(reach)}</p>
                    <p className="mt-0.5 text-[11px] text-muted">Not verified impressions — same rule as before.</p>
                  </div>
                ) : null}
              </Card>

              <div className="flex flex-wrap gap-2 border-t border-navy/[0.06] pt-5">
                <Button variant="secondary" onClick={goBack}>
                  Back
                </Button>
                <Button onClick={goNext} disabled={continueDisabled}>
                  Continue to Review Campaign
                </Button>
                <Button variant="ghost" onClick={saveDraft} disabled={hoursInvalid}>
                  Save as Draft
                </Button>
                {draftSaved ? <span className="self-center text-xs font-medium text-teal">Draft saved</span> : null}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <StepHeading
                title="Stage 3 — Review Campaign"
                subtitle="Check every section below. Your budget was set in the previous stage — change it there if needed. Submitting sends your campaign to admin review; it is not automatic approval or payment."
              />

              {/* Creative preview */}
              <Card padding="sm" className="!p-4 sm:!p-5">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-bold text-navy">Creative preview</h4>
                  <button type="button" className="text-xs font-semibold text-teal hover:underline" onClick={() => goToStep(1)}>
                    Edit
                  </button>
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-navy/[0.08] bg-navy/[0.03]">
                  {!draft.creative ? (
                    <div className="p-2">
                      <EmptyState
                        title="No creative attached"
                        description="Go back to Create Your Ad to upload or select an image or video from your library."
                        action={
                          <Button type="button" size="sm" variant="secondary" onClick={() => goToStep(1)}>
                            Add creative
                          </Button>
                        }
                      />
                    </div>
                  ) : draft.creative.previewUrl && draft.format === 'Static image' ? (
                    <div className="mx-auto max-w-xl p-3">
                      <img
                        src={draft.creative.previewUrl}
                        alt=""
                        className="aspect-video w-full rounded-lg object-contain bg-black"
                      />
                    </div>
                  ) : draft.creative.previewUrl && draft.format === 'Video' ? (
                    <div className="mx-auto max-w-xl p-3">
                      <video
                        src={draft.creative.previewUrl}
                        controls
                        className="aspect-video w-full rounded-lg object-contain bg-black"
                      />
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-navy">Library creative · no local preview file</p>
                      <p className="mt-1 text-xs text-muted">{draft.creative.fileName}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Structured review */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Card padding="sm" className="!p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-navy">Campaign information</h4>
                    <button type="button" className="text-xs font-semibold text-teal hover:underline" onClick={() => goToStep(1)}>
                      Edit
                    </button>
                  </div>
                  <dl className="mt-3 space-y-2.5 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Campaign name</dt>
                      <dd className="font-semibold text-navy">{draft.name || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Objective</dt>
                      <dd className="font-semibold text-navy">{draft.objective || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Description</dt>
                      <dd className="break-words text-navy">{draft.description.trim() ? draft.description : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Landing page</dt>
                      <dd className="break-all text-navy">{draft.landingPageUrl.trim() ? draft.landingPageUrl : '—'}</dd>
                    </div>
                  </dl>
                </Card>

                <Card padding="sm" className="!p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-navy">Advertisement creative</h4>
                    <button type="button" className="text-xs font-semibold text-teal hover:underline" onClick={() => goToStep(1)}>
                      Edit
                    </button>
                  </div>
                  <dl className="mt-3 space-y-2.5 text-sm">
                    <div>
                      <dt className="text-xs text-muted">File name</dt>
                      <dd className="font-semibold text-navy">{draft.creative?.fileName ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Format</dt>
                      <dd className="font-semibold text-navy">
                        {draft.format === 'Static image' ? 'Image' : draft.format || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Size</dt>
                      <dd className="text-navy">
                        {draft.creative && draft.creative.sizeBytes > 0
                          ? formatFileSize(draft.creative.sizeBytes)
                          : draft.creative
                            ? '—'
                            : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Moderation</dt>
                      <dd className="text-navy">{draft.creative?.moderationStatus ?? '—'}</dd>
                    </div>
                  </dl>
                </Card>

                <Card padding="sm" className="!p-4 sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-navy">Target locations</h4>
                    <button type="button" className="text-xs font-semibold text-teal hover:underline" onClick={() => goToStep(2)}>
                      Edit
                    </button>
                  </div>
                  <p className="mt-2 text-sm font-medium text-navy">
                    {draft.locations.length ? draft.locations.join(' · ') : '—'}
                  </p>
                </Card>

                <Card padding="sm" className="!p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-navy">Auto selection</h4>
                    <button type="button" className="text-xs font-semibold text-teal hover:underline" onClick={() => goToStep(2)}>
                      Edit
                    </button>
                  </div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Total requested</dt>
                      <dd className="text-lg font-bold tabular-nums text-navy">{formatNumber(draft.requestedAutos)}</dd>
                    </div>
                    {draft.locations.length ? (
                      <ul className="space-y-1.5 border-t border-navy/[0.06] pt-2 text-muted">
                        {draft.locations.map((area) => (
                          <li key={area} className="flex justify-between gap-2 text-xs">
                            <span>{area}</span>
                            <span className="tabular-nums font-semibold text-navy">
                              {formatNumber(draft.locationRequests[area] ?? 0)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </dl>
                </Card>

                <Card padding="sm" className="!p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-navy">Campaign schedule</h4>
                    <button type="button" className="text-xs font-semibold text-teal hover:underline" onClick={() => goToStep(2)}>
                      Edit
                    </button>
                  </div>
                  <dl className="mt-3 space-y-2.5 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Dates</dt>
                      <dd className="font-semibold text-navy">
                        {draft.startDate && draft.endDate
                          ? `${draft.startDate} → ${draft.endDate} (${days} day${days === 1 ? '' : 's'})`
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Operating hours</dt>
                      <dd className="font-semibold text-navy">
                        {draft.operatingStart}–{draft.operatingEnd} ({operatingHoursPerDay(draft).toFixed(1)} hrs/day)
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Weekdays</dt>
                      <dd className="text-navy">{draft.daysOfWeek.map((d) => d.slice(0, 3)).join(', ') || '—'}</dd>
                    </div>
                  </dl>
                </Card>

                <Card padding="sm" className="!p-4 sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-navy">Playback settings</h4>
                    <button type="button" className="text-xs font-semibold text-teal hover:underline" onClick={() => goToStep(2)}>
                      Edit
                    </button>
                  </div>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Ad duration</dt>
                      <dd className="font-semibold text-navy">{draft.adDurationSeconds}s per spot</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Frequency cap</dt>
                      <dd className="font-semibold text-navy">{draft.frequencyCap} plays / device / day</dd>
                    </div>
                  </dl>
                </Card>

                <Card padding="sm" className="!p-4 sm:col-span-2 border-teal/20 bg-gradient-to-br from-card to-teal-muted/15">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-navy">Campaign budget</h4>
                    <button type="button" className="text-xs font-semibold text-teal hover:underline" onClick={() => goToStep(2)}>
                      Edit
                    </button>
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-navy">
                    {draft.campaignBudgetInr > 0 ? formatInr(draft.campaignBudgetInr) : '—'}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Committed budget you entered in Audience &amp; Schedule. Taxes and final invoice totals follow platform
                    billing — not shown here as final.
                  </p>
                  <p className="mt-3 text-xs text-muted">
                    Estimated reach (modelled): <span className="font-semibold text-navy">{formatNumber(reach)}</span> — not
                    verified impressions.
                  </p>
                </Card>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-navy/10 bg-paper/80 px-4 py-3 text-sm text-navy">
                <input
                  type="checkbox"
                  className="mt-1 accent-auto"
                  checked={confirmSubmit}
                  onChange={(event) => setConfirmSubmit(event.target.checked)}
                />
                <span>
                  I confirm these details are correct. I understand that <strong>Submit for Approval</strong> sends this
                  campaign to <strong>admin review</strong> — it does not mean the campaign is approved, does not start live
                  fleet playback, and does not collect payment.
                </span>
              </label>

              {submitBlockers.length ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  Before submit: {submitBlockers.join(' · ')}
                </p>
              ) : (
                <p className="text-sm text-teal">Ready to submit for admin review.</p>
              )}

              {errors.length ? (
                <ul className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
                  {errors.map((error) => (
                    <li key={error}>• {error}</li>
                  ))}
                </ul>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-navy/[0.06] pt-4">
                <Button variant="secondary" onClick={goBack}>
                  Back to Edit
                </Button>
                <Button variant="ghost" onClick={saveDraft} disabled={hoursInvalid}>
                  Save as Draft
                </Button>
                <Button onClick={goNext} disabled={hoursInvalid}>
                  Submit for Approval
                </Button>
                {draftSaved ? <span className="self-center text-xs font-medium text-teal">Draft saved</span> : null}
              </div>
            </div>
          ) : null}

          {step !== 3 && errors.length ? (
            <ul className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
              {errors.map((error) => (
                <li key={error}>• {error}</li>
              ))}
            </ul>
          ) : null}
        </Card>

        <div className="hidden xl:block">
          <CampaignWizardSummary draft={draft} onEditStep={goToStep} />
        </div>
      </div>
    </PageLayout>
  )
}
