import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { devLogin } from '../api/authApi'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { PageLayout } from '../components/ui/PageLayout'
import { inputClass, labelClass } from '../components/wizard/fieldStyles'
import { useAdvertiser } from '../context/AdvertiserContext'
import { useWorkspace } from '../context/AdvertiserWorkspaceContext'
import { isApiConfigured } from '../lib/config'
import { verificationClass } from '../lib/statusStyles'

const tabs = ['Personal', 'Company', 'Tax & billing', 'Notifications', 'Security'] as const
type Tab = (typeof tabs)[number]

const docStatusClass: Record<string, string> = {
  Submitted: 'rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700',
  Approved: 'rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800',
  Rejected: 'rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800',
  Required: 'rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900',
}

const SEED_LOGINS = [
  'new@autoads.test',
  'drafts@autoads.test',
  'pending@autoads.test',
  'live@autoads.test',
  'completed@autoads.test',
] as const

export function SettingsPage() {
  const navigate = useNavigate()
  const { account, profile, verification, updateProfile, applyApiUser } = useAdvertiser()
  const { reload } = useWorkspace()
  const [tab, setTab] = useState<Tab>('Personal')
  const [form, setForm] = useState(profile)
  const [personal, setPersonal] = useState({
    fullName: account.fullName,
    email: profile.contactEmail,
    phone: profile.contactPhone,
  })
  const [tax, setTax] = useState({
    gstin: profile.gstin,
    billingEmail: profile.contactEmail,
    billingAddress: profile.registeredAddress,
    pan: '',
  })
  const [notifyPrefs, setNotifyPrefs] = useState({
    campaignStatus: true,
    creativeModeration: true,
    invoices: true,
    teamChanges: false,
  })
  const [security, setSecurity] = useState({
    twoFactor: false,
    sessionTimeout: '8 hours',
  })
  const [apiEmail, setApiEmail] = useState('live@autoads.test')
  const [apiBusy, setApiBusy] = useState(false)
  const [apiError, setApiError] = useState('')
  const [saved, setSaved] = useState('')

  function patchCompany<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setSaved('')
  }

  function saveCompany() {
    updateProfile({
      ...form,
      contactName: personal.fullName || form.contactName,
      contactEmail: personal.email || form.contactEmail,
      contactPhone: personal.phone || form.contactPhone,
      gstin: tax.gstin || form.gstin,
      registeredAddress: tax.billingAddress || form.registeredAddress,
    })
    setSaved('Company profile saved for this workspace.')
  }

  return (
    <PageLayout>
      <PageHeader
        title="Settings"
        description="Personal profile, company profile, tax and billing details, notification preferences, and security controls."
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              tab === item ? 'bg-navy text-white' : 'border border-navy/12 bg-white text-navy hover:border-navy/25'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Personal' ? (
        <Card>
          <CardHeader title="Personal profile" description="Primary operator details for this advertiser account" />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Full name
              <input
                className={inputClass}
                value={personal.fullName}
                onChange={(event) => setPersonal((current) => ({ ...current, fullName: event.target.value }))}
              />
            </label>
            <label className={labelClass}>
              Email
              <input
                className={inputClass}
                value={personal.email}
                onChange={(event) => setPersonal((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label className={labelClass}>
              Phone
              <input
                className={inputClass}
                value={personal.phone}
                onChange={(event) => setPersonal((current) => ({ ...current, phone: event.target.value }))}
              />
            </label>
            <label className={labelClass}>
              City
              <input className={inputClass} value={account.city} readOnly />
            </label>
          </div>
          <div className="mt-5">
            <Button
              onClick={() => {
                updateProfile({
                  ...form,
                  contactName: personal.fullName,
                  contactEmail: personal.email,
                  contactPhone: personal.phone,
                })
                setSaved('Personal profile saved.')
              }}
            >
              Save personal profile
            </Button>
          </div>
        </Card>
      ) : null}

      {tab === 'Company' ? (
        <>
          <Card>
            <CardHeader title="Company profile" description="Legal and trade identity used on campaigns and invoices" />
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ['legalName', 'Legal name'],
                  ['tradeName', 'Trade / brand name'],
                  ['businessType', 'Business type'],
                  ['industry', 'Industry'],
                  ['registeredAddress', 'Registered address'],
                  ['city', 'City'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className={labelClass}>
                  {label}
                  <input className={inputClass} value={form[key]} onChange={(event) => patchCompany(key, event.target.value)} />
                </label>
              ))}
            </div>
            <div className="mt-5">
              <Button onClick={saveCompany}>Save company profile</Button>
            </div>
          </Card>
          <Card className="border-teal/15 bg-gradient-to-br from-card to-teal-muted/30">
            <CardHeader
              title="Business onboarding (KYC)"
              description="Status: Pending, Under Review, Verified, or Rejected. NestJS + Supabase will own the source of truth."
            />
            <div className="flex flex-wrap items-center gap-3">
              <span className={verificationClass(verification.status)}>KYC · {verification.status}</span>
              {verification.submittedOn ? (
                <span className="text-sm text-muted">Submitted {verification.submittedOn}</span>
              ) : (
                <span className="text-sm text-muted">Not submitted yet</span>
              )}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-navy/80">{verification.notes}</p>
            <ul className="mt-4 divide-y divide-navy/[0.06]">
              {verification.documents.map((doc) => (
                <li key={doc.label} className="flex items-center justify-between gap-4 py-3">
                  <span className="text-sm font-medium text-navy">{doc.label}</span>
                  <span className={docStatusClass[doc.status]}>{doc.status}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}

      {tab === 'Tax & billing' ? (
        <Card>
          <CardHeader
            title="Tax and billing details"
            description="GST and billing contacts for invoices. Actual tax calculation remains on issued invoices."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              GSTIN
              <input
                className={inputClass}
                value={tax.gstin}
                onChange={(event) => setTax((current) => ({ ...current, gstin: event.target.value }))}
              />
            </label>
            <label className={labelClass}>
              PAN (optional)
              <input
                className={inputClass}
                value={tax.pan}
                onChange={(event) => setTax((current) => ({ ...current, pan: event.target.value }))}
              />
            </label>
            <label className={labelClass}>
              Billing email
              <input
                className={inputClass}
                value={tax.billingEmail}
                onChange={(event) => setTax((current) => ({ ...current, billingEmail: event.target.value }))}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Billing address
              <textarea
                rows={3}
                className={inputClass}
                value={tax.billingAddress}
                onChange={(event) => setTax((current) => ({ ...current, billingAddress: event.target.value }))}
              />
            </label>
          </div>
          <div className="mt-5">
            <Button
              onClick={() => {
                updateProfile({
                  ...form,
                  gstin: tax.gstin,
                  contactEmail: tax.billingEmail || form.contactEmail,
                  registeredAddress: tax.billingAddress || form.registeredAddress,
                })
                setSaved('Tax and billing details saved locally for this workspace.')
              }}
            >
              Save tax & billing
            </Button>
          </div>
        </Card>
      ) : null}

      {tab === 'Notifications' ? (
        <Card>
          <CardHeader title="Notification preferences" description="Choose which account alerts to surface in Notifications" />
          <ul className="space-y-3">
            {(
              [
                ['campaignStatus', 'Campaign status updates'],
                ['creativeModeration', 'Creative moderation updates'],
                ['invoices', 'Invoice and payment notices'],
                ['teamChanges', 'Team membership changes'],
              ] as const
            ).map(([key, label]) => (
              <li key={key} className="flex items-center justify-between rounded-xl bg-paper px-4 py-3">
                <span className="text-sm font-medium text-navy">{label}</span>
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    notifyPrefs[key] ? 'bg-teal text-white' : 'bg-navy/10 text-muted'
                  }`}
                  onClick={() => {
                    setNotifyPrefs((current) => ({ ...current, [key]: !current[key] }))
                    setSaved('Notification preferences updated locally.')
                  }}
                >
                  {notifyPrefs[key] ? 'On' : 'Off'}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {tab === 'Security' ? (
        <>
          <Card>
            <CardHeader
              title="Sign in to AutoAds API"
              description={
                isApiConfigured()
                  ? 'Connect to NestJS + Postgres for a real company workspace. Use live@autoads.test for a manager demo with campaigns already in the database.'
                  : 'Set VITE_API_BASE_URL=http://localhost:3000 in apps/advertiser-web/.env, restart Vite, then sign in here.'
              }
            />
            <div className="mb-3 flex flex-wrap gap-2">
              {(
                [
                  ['live@autoads.test', 'Live campaigns'],
                  ['new@autoads.test', 'Empty account'],
                  ['pending@autoads.test', 'Under review'],
                ] as const
              ).map(([email, label]) => (
                <button
                  key={email}
                  type="button"
                  disabled={!isApiConfigured() || apiBusy}
                  onClick={() => setApiEmail(email)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    apiEmail === email
                      ? 'bg-navy text-white'
                      : 'border border-navy/12 bg-white text-navy hover:border-navy/25'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className={labelClass}>
              Advertiser email
              <select
                className={inputClass}
                value={apiEmail}
                onChange={(event) => setApiEmail(event.target.value)}
                disabled={!isApiConfigured() || apiBusy}
              >
                {SEED_LOGINS.map((email) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
            </label>
            {apiError ? <p className="mt-2 text-sm font-medium text-rose-700">{apiError}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                disabled={!isApiConfigured() || apiBusy}
                onClick={async () => {
                  setApiBusy(true)
                  setApiError('')
                  try {
                    const result = await devLogin(apiEmail)
                    applyApiUser(result.user)
                    setSaved(`Signed in as ${result.user.email} · ${result.user.companyName}`)
                    reload()
                    navigate('/dashboard')
                  } catch (error) {
                    setApiError(error instanceof Error ? error.message : 'API login failed')
                  } finally {
                    setApiBusy(false)
                  }
                }}
              >
                {apiBusy ? 'Connecting…' : 'Sign in & open Dashboard'}
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted">
              After sign-in, open Campaigns to filter real DB rows. Analytics/Billing stay empty until playback and
              invoice services report data — that is intentional.
            </p>
          </Card>
          <Card>
            <CardHeader
              title="Security preferences"
              description="Workspace security preferences. Production auth uses Supabase Auth + NestJS JWT validation + Postgres RLS."
            />
            <ul className="space-y-3">
              <li className="flex items-center justify-between rounded-xl bg-paper px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-navy">Two-factor authentication</p>
                  <p className="text-xs text-muted">Prepared for Supabase Auth MFA.</p>
                </div>
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    security.twoFactor ? 'bg-teal text-white' : 'bg-navy/10 text-muted'
                  }`}
                  onClick={() => {
                    setSecurity((current) => ({ ...current, twoFactor: !current.twoFactor }))
                    setSaved('Security preference updated locally.')
                  }}
                >
                  {security.twoFactor ? 'Enabled' : 'Disabled'}
                </button>
              </li>
              <li className="rounded-xl bg-paper px-4 py-3">
                <label className={labelClass}>
                  Session timeout preference
                  <select
                    className={inputClass}
                    value={security.sessionTimeout}
                    onChange={(event) => {
                      setSecurity((current) => ({ ...current, sessionTimeout: event.target.value }))
                      setSaved('Security preference updated locally.')
                    }}
                  >
                    <option>1 hour</option>
                    <option>8 hours</option>
                    <option>24 hours</option>
                  </select>
                </label>
              </li>
            </ul>
          </Card>
        </>
      ) : null}

      {saved ? <p className="text-sm font-medium text-teal">{saved}</p> : null}
    </PageLayout>
  )
}
