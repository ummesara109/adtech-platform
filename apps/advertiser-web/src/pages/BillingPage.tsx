import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  IconCalendar,
  IconCheck,
  IconDownload,
  IconPulse,
  IconSpend,
} from '../components/dashboard/DashboardIcons'
import { Button, ButtonLink } from '../components/ui/Button'
import { Callout } from '../components/ui/Callout'
import { Card, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { PageLayout } from '../components/ui/PageLayout'
import { TableHead, TableShell, Td, Th } from '../components/ui/TableShell'
import { useWorkspace } from '../context/AdvertiserWorkspaceContext'
import { formatInr } from '../lib/format'
import { paymentStatusClass } from '../lib/statusStyles'
import type { InvoiceSummary, PaymentHistoryRow, PaymentStatus } from '../types/advertiser'
import { paymentStatuses } from '../types/advertiser'

function isDemoId(id: string) {
  return id.startsWith('TEST-')
}

function paymentMethodLabel(row: PaymentHistoryRow): string {
  if (isDemoId(row.id) || isDemoId(row.reference)) {
    if (/UPI/i.test(row.reference)) return 'UPI · demo sample'
    return 'Demo sample · not a live settlement'
  }
  return '—'
}

function MoneyCard({
  label,
  value,
  hint,
  icon,
  iconWrap,
  empty,
  demo,
}: {
  label: string
  value: string
  hint: string
  icon: ReactNode
  iconWrap: string
  empty?: boolean
  demo?: boolean
}) {
  return (
    <article className="flex gap-3 rounded-2xl border border-navy/[0.06] bg-card p-4 shadow-[var(--shadow-card)]">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconWrap}`} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        {empty ? (
          <>
            <p className="mt-0.5 text-lg font-bold text-navy">—</p>
            <p className="mt-1 text-[11px] leading-snug text-amber-800">No billing records yet</p>
          </>
        ) : (
          <>
            <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-navy">{value}</p>
            <p className="mt-1 text-[11px] leading-snug text-muted">{hint}</p>
            {demo ? (
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800">Demo data</p>
            ) : null}
          </>
        )}
      </div>
    </article>
  )
}

function InvoicePreviewModal({
  invoice,
  onClose,
  onDownload,
  isDemo,
}: {
  invoice: InvoiceSummary
  onClose: () => void
  onDownload: () => void
  isDemo: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-preview-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p id="invoice-preview-title" className="text-lg font-bold text-navy">
              Invoice preview
            </p>
            <p className="mt-0.5 font-mono text-sm text-muted">{invoice.id}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </div>

        {isDemo ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Demo / sample invoice for frontend preview — not a legal tax invoice and not collected through a payment
            gateway.
          </p>
        ) : (
          <p className="mt-3 rounded-xl border border-navy/10 bg-paper px-3 py-2 text-xs text-muted">
            Preview of a workspace billing row. Official PDFs will come from platform billing when the API is connected.
          </p>
        )}

        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-navy/[0.06] pb-2">
            <dt className="text-muted">Campaign</dt>
            <dd className="text-right font-semibold text-navy">{invoice.campaignName}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-navy/[0.06] pb-2">
            <dt className="text-muted">Issued on</dt>
            <dd className="text-right tabular-nums text-navy">{invoice.issuedOn}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-navy/[0.06] pb-2">
            <dt className="text-muted">Amount</dt>
            <dd className="text-right text-lg font-bold tabular-nums text-navy">{formatInr(invoice.amountInr)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Payment status</dt>
            <dd>
              <span className={paymentStatusClass(invoice.paymentStatus)}>{invoice.paymentStatus}</span>
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button size="sm" onClick={onDownload}>
            <IconDownload className="h-4 w-4" />
            Download invoice
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}

function downloadInvoiceText(invoice: InvoiceSummary, isDemo: boolean) {
  const banner = isDemo
    ? '*** DEMO / SAMPLE DOCUMENT — NOT A LEGAL INVOICE — NOT A LIVE PAYMENT ***'
    : '*** WORKSPACE PREVIEW — OFFICIAL PDF ISSUED BY PLATFORM BILLING WHEN CONNECTED ***'
  const body = [
    banner,
    '',
    'AutoAds — Advertiser invoice preview',
    `Invoice number: ${invoice.id}`,
    `Campaign: ${invoice.campaignName}`,
    `Issued on: ${invoice.issuedOn}`,
    `Amount (INR): ${invoice.amountInr}`,
    `Payment status: ${invoice.paymentStatus}`,
    '',
    'This file was generated in the advertiser web app for UI testing only.',
    'No payment gateway was charged.',
    banner,
  ].join('\n')

  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${invoice.id}${isDemo ? '-DEMO' : ''}.txt`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function BillingPage() {
  const { data, loading, error, connectionNotice, reload } = useWorkspace()
  const { campaigns, invoices, paymentHistory } = data

  const [preview, setPreview] = useState<InvoiceSummary | null>(null)
  const [paymentQuery, setPaymentQuery] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'all' | PaymentStatus>('all')

  const hasBillingRows = invoices.length > 0 || paymentHistory.length > 0
  const hasDemoBilling = invoices.some((row) => isDemoId(row.id)) || paymentHistory.some((row) => isDemoId(row.id))

  const totals = useMemo(() => {
    const invoiced = invoices.reduce((sum, row) => sum + row.amountInr, 0)
    const paidFromInvoices = invoices
      .filter((row) => row.paymentStatus === 'Paid')
      .reduce((sum, row) => sum + row.amountInr, 0)
    const paidFromPayments = paymentHistory
      .filter((row) => row.status === 'Paid')
      .reduce((sum, row) => sum + row.amountInr, 0)
    // Prefer invoice paid totals when invoices exist; otherwise use payment history.
    const paid = invoices.length > 0 ? paidFromInvoices : paidFromPayments
    const outstanding = invoices
      .filter((row) => row.paymentStatus === 'Pending' || row.paymentStatus === 'Authorized')
      .reduce((sum, row) => sum + row.amountInr, 0)

    return {
      expenditure: invoices.length > 0 ? invoiced : paidFromPayments > 0 ? paidFromPayments : null,
      paid: paid > 0 || invoices.some((r) => r.paymentStatus === 'Paid') ? paid : paidFromPayments > 0 ? paidFromPayments : null,
      outstanding: invoices.length > 0 ? outstanding : null,
    }
  }, [invoices, paymentHistory])

  const filteredPayments = useMemo(() => {
    const q = paymentQuery.trim().toLowerCase()
    return paymentHistory.filter((row) => {
      if (paymentStatus !== 'all' && row.status !== paymentStatus) return false
      if (!q) return true
      return (
        row.id.toLowerCase().includes(q) ||
        row.reference.toLowerCase().includes(q) ||
        row.campaignName.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q)
      )
    })
  }, [paymentHistory, paymentQuery, paymentStatus])

  const campaignBilling = useMemo(() => {
    return campaigns
      .filter((c) => !['Draft', 'Cancelled', 'Rejected'].includes(c.status) || c.budgetInr > 0)
      .map((campaign) => {
        const relatedInvoices = invoices.filter((inv) => inv.campaignName === campaign.name)
        const relatedPayments = paymentHistory.filter(
          (row) => row.campaignName === campaign.name && row.status === 'Paid',
        )
        const invoiced =
          relatedInvoices.length > 0 ? relatedInvoices.reduce((s, r) => s + r.amountInr, 0) : null
        const paidFromInv = relatedInvoices
          .filter((r) => r.paymentStatus === 'Paid')
          .reduce((s, r) => s + r.amountInr, 0)
        const paidFromPay = relatedPayments.reduce((s, r) => s + r.amountInr, 0)
        const paid =
          relatedInvoices.length > 0
            ? paidFromInv > 0 || relatedInvoices.some((r) => r.paymentStatus === 'Paid')
              ? paidFromInv
              : null
            : paidFromPay > 0
              ? paidFromPay
              : null
        const outstanding =
          relatedInvoices.length > 0
            ? relatedInvoices
                .filter((r) => r.paymentStatus === 'Pending' || r.paymentStatus === 'Authorized')
                .reduce((s, r) => s + r.amountInr, 0)
            : null

        return {
          campaign,
          committed: campaign.budgetInr || 0,
          invoiced,
          paid,
          outstanding,
        }
      })
  }, [campaigns, invoices, paymentHistory])

  return (
    <PageLayout className="max-w-[88rem] space-y-6">
      <PageHeader
        title="Billing"
        description="Invoices, payments, and campaign budgets for this advertiser. This portal does not process payments."
        actions={
          <>
            <ButtonLink to="/campaigns" variant="secondary">
              Campaigns
            </ButtonLink>
            <ButtonLink to="/settings" variant="ghost">
              Tax &amp; billing
            </ButtonLink>
          </>
        }
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          <p className="font-semibold">Could not load billing</p>
          <p className="mt-1">{error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={reload}>
            Retry
          </Button>
        </div>
      ) : null}

      {connectionNotice ? <Callout variant="info">{connectionNotice}</Callout> : null}

      <Callout variant="measurement">
        Amounts come from workspace invoice and payment rows only — never inferred from campaign schedules. Committed
        budget is planned spend, separate from invoiced or paid amounts.
        {hasDemoBilling
          ? ' Rows marked Demo / TEST are sample data for frontend testing, not live customer billing.'
          : ' Connect NestJS billing to replace empty states with platform invoices.'}
      </Callout>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MoneyCard
            label="Total Campaign Expenditure"
            value={totals.expenditure != null ? formatInr(totals.expenditure) : '—'}
            hint="Sum of issued invoice amounts (or paid rows if invoices are absent)"
            icon={<IconSpend className="h-5 w-5" />}
            iconWrap="bg-violet-50 text-violet-700"
            empty={!hasBillingRows || totals.expenditure == null}
            demo={hasDemoBilling && totals.expenditure != null}
          />
          <MoneyCard
            label="Paid Amount"
            value={totals.paid != null ? formatInr(totals.paid) : '—'}
            hint="Paid invoices or confirmed payment history rows"
            icon={<IconCheck className="h-5 w-5" />}
            iconWrap="bg-emerald-50 text-emerald-700"
            empty={!hasBillingRows || totals.paid == null}
            demo={hasDemoBilling && totals.paid != null}
          />
          <MoneyCard
            label="Outstanding Amount"
            value={totals.outstanding != null ? formatInr(totals.outstanding) : '—'}
            hint="Pending or authorized invoices awaiting settlement"
            icon={<IconPulse className="h-5 w-5" />}
            iconWrap="bg-amber-50 text-amber-800"
            empty={invoices.length === 0 || totals.outstanding == null}
            demo={hasDemoBilling && totals.outstanding != null}
          />
        </section>
      )}

      {/* Invoice history */}
      <Card padding="md">
        <CardHeader
          title="Invoice history"
          description="Issued invoices for this advertiser. View and download are UI previews only."
          action={
            hasDemoBilling ? (
              <span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                Includes demo
              </span>
            ) : null
          }
        />
        {invoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="Platform billing will list invoices here after campaign checkout. This screen does not invent invoice totals from budgets."
          />
        ) : (
          <TableShell minWidth="880px">
            <TableHead>
              <tr>
                <Th>Invoice number</Th>
                <Th>Campaign</Th>
                <Th>Invoice date</Th>
                <Th>Amount</Th>
                <Th>Payment status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </TableHead>
            <tbody>
              {invoices.map((invoice) => {
                const demo = isDemoId(invoice.id)
                return (
                  <tr key={invoice.id} className="hover:bg-paper/80">
                    <Td>
                      <p className="font-mono text-sm font-semibold text-navy">{invoice.id}</p>
                      {demo ? (
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                          Demo sample
                        </p>
                      ) : null}
                    </Td>
                    <Td className="max-w-[12rem]">
                      <p className="truncate font-medium text-navy" title={invoice.campaignName}>
                        {invoice.campaignName}
                      </p>
                    </Td>
                    <Td className="tabular-nums text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <IconCalendar className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                        {invoice.issuedOn}
                      </span>
                    </Td>
                    <Td className="font-semibold tabular-nums text-navy">{formatInr(invoice.amountInr)}</Td>
                    <Td>
                      <span className={paymentStatusClass(invoice.paymentStatus)}>{invoice.paymentStatus}</span>
                    </Td>
                    <Td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button variant="ghost" size="sm" className="!text-xs" onClick={() => setPreview(invoice)}>
                          View Invoice
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="!text-xs"
                          onClick={() => downloadInvoiceText(invoice, demo)}
                        >
                          <IconDownload className="h-3.5 w-3.5" />
                          Download
                        </Button>
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </TableShell>
        )}
      </Card>

      {/* Payment history */}
      <Card padding="md">
        <CardHeader
          title="Payment history"
          description="Confirmed and pending transactions from workspace payment rows"
        />
        {paymentHistory.length === 0 ? (
          <EmptyState
            title="No payment history"
            description="Paid and authorized transactions appear after platform billing records a settlement. No gateway charges happen in this app."
          />
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="min-w-[14rem] flex-1 text-xs font-semibold text-muted">
                Search
                <input
                  type="search"
                  placeholder="Transaction ID, campaign, reference…"
                  className="mt-1 block w-full rounded-xl border border-navy/12 bg-white px-3 py-2 text-sm text-navy"
                  value={paymentQuery}
                  onChange={(event) => setPaymentQuery(event.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                Status
                <select
                  className="mt-1 block w-full rounded-xl border border-navy/12 bg-white px-3 py-2 text-sm text-navy sm:min-w-[10rem]"
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value as 'all' | PaymentStatus)}
                >
                  <option value="all">All statuses</option>
                  {paymentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              {paymentQuery || paymentStatus !== 'all' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPaymentQuery('')
                    setPaymentStatus('all')
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>

            {filteredPayments.length === 0 ? (
              <EmptyState
                title="No matching payments"
                description="Try another search term or clear the status filter."
              />
            ) : (
              <TableShell minWidth="920px">
                <TableHead>
                  <tr>
                    <Th>Transaction ID</Th>
                    <Th>Date</Th>
                    <Th>Campaign</Th>
                    <Th>Payment method</Th>
                    <Th>Amount</Th>
                    <Th>Status</Th>
                  </tr>
                </TableHead>
                <tbody>
                  {filteredPayments.map((row) => {
                    const demo = isDemoId(row.id) || isDemoId(row.reference)
                    return (
                      <tr key={row.id} className="hover:bg-paper/80">
                        <Td>
                          <p className="font-mono text-sm font-semibold text-navy">{row.id}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-muted">{row.reference}</p>
                          {demo ? (
                            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                              Demo sample
                            </p>
                          ) : null}
                        </Td>
                        <Td className="tabular-nums text-muted">{row.date}</Td>
                        <Td className="max-w-[12rem]">
                          <p className="truncate font-medium text-navy" title={row.campaignName}>
                            {row.campaignName}
                          </p>
                        </Td>
                        <Td className="text-xs text-muted">{paymentMethodLabel(row)}</Td>
                        <Td className="font-semibold tabular-nums text-navy">{formatInr(row.amountInr)}</Td>
                        <Td>
                          <span className={paymentStatusClass(row.status)}>{row.status}</span>
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </TableShell>
            )}
          </>
        )}
      </Card>

      {/* Campaign billing */}
      <Card padding="md">
        <CardHeader
          title="Campaign billing"
          description="Committed budget stays separate from invoiced and paid amounts"
        />
        {campaignBilling.length === 0 ? (
          <EmptyState
            title="No campaign billing rows"
            description="Create a campaign with a budget to see committed amounts. Invoiced and paid columns fill when billing records exist."
            action={
              <ButtonLink to="/campaigns/create" size="sm">
                Create campaign
              </ButtonLink>
            }
          />
        ) : (
          <TableShell minWidth="960px">
            <TableHead>
              <tr>
                <Th>Campaign</Th>
                <Th>Committed budget</Th>
                <Th>Invoiced</Th>
                <Th>Paid</Th>
                <Th>Outstanding</Th>
              </tr>
            </TableHead>
            <tbody>
              {campaignBilling.map(({ campaign, committed, invoiced, paid, outstanding }) => (
                <tr key={campaign.id} className="hover:bg-paper/80">
                  <Td>
                    <Link to={`/campaigns/${campaign.id}`} className="font-semibold text-navy hover:text-teal">
                      {campaign.name}
                    </Link>
                    <p className="font-mono text-[10px] text-muted">{campaign.id}</p>
                  </Td>
                  <Td className="tabular-nums text-navy">
                    {committed > 0 ? formatInr(committed) : '—'}
                    <p className="text-[10px] text-muted">Planned · not expenditure</p>
                  </Td>
                  <Td className="tabular-nums text-muted">
                    {invoiced == null ? '—' : formatInr(invoiced)}
                  </Td>
                  <Td className="tabular-nums text-muted">{paid == null ? '—' : formatInr(paid)}</Td>
                  <Td className="tabular-nums text-muted">
                    {outstanding == null ? '—' : formatInr(outstanding)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      {preview ? (
        <InvoicePreviewModal
          invoice={preview}
          isDemo={isDemoId(preview.id)}
          onClose={() => setPreview(null)}
          onDownload={() => downloadInvoiceText(preview, isDemoId(preview.id))}
        />
      ) : null}
    </PageLayout>
  )
}
