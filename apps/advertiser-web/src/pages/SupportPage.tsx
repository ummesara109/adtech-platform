import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { PageLayout } from '../components/ui/PageLayout'
import { TableHead, TableShell, Td, Th } from '../components/ui/TableShell'
import { inputClass, labelClass } from '../components/wizard/fieldStyles'
import { supportTickets as seedTickets } from '../data/workspace'
import { campaignStatusClass } from '../lib/statusStyles'
import type { CampaignStatus } from '../types/advertiser'

type Ticket = (typeof seedTickets)[number]

export function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>(seedTickets)
  const [category, setCategory] = useState('Campaign')
  const [subject, setSubject] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  function submit() {
    setError('')
    setSaved('')
    if (!subject.trim() || !details.trim()) {
      setError('Enter a subject and details for your support request.')
      return
    }
    const ticket: Ticket = {
      id: `TKT-${300 + tickets.length + 1}`,
      subject: subject.trim(),
      category,
      status: 'In progress',
      updated: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    }
    setTickets((current) => [ticket, ...current])
    setSubject('')
    setDetails('')
    setSaved(`Request ${ticket.id} submitted. Track status below.`)
  }

  return (
    <PageLayout>
      <PageHeader
        title="Support"
        description="Submit a support request and track request status for campaigns, creatives, devices, billing, or account issues."
      />

      <Card>
        <CardHeader title="New request" description="Describe the issue. Operations and support handle tickets from this queue." />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Category
            <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>Campaign</option>
              <option>Creatives</option>
              <option>Billing</option>
              <option>Device / playback</option>
              <option>Account</option>
            </select>
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Subject
            <input
              className={inputClass}
              placeholder="Short summary"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Details
            <textarea
              rows={4}
              className={inputClass}
              placeholder="What happened, campaign ID, and any evidence"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
            />
          </label>
        </div>
        {error ? <p className="mt-3 text-sm font-medium text-rose-700">{error}</p> : null}
        {saved ? <p className="mt-3 text-sm font-medium text-teal">{saved}</p> : null}
        <div className="mt-4">
          <Button onClick={submit}>Submit request</Button>
        </div>
      </Card>

      <Card padding="sm">
        <CardHeader title="Request status" description="Open and resolved support tickets" />
        <TableShell>
          <TableHead>
            <tr>
              <Th>Ticket</Th>
              <Th>Subject</Th>
              <Th>Category</Th>
              <Th>Status</Th>
              <Th>Updated</Th>
            </tr>
          </TableHead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-paper/80">
                <Td className="font-mono font-medium text-navy">{ticket.id}</Td>
                <Td className="text-navy">{ticket.subject}</Td>
                <Td className="text-muted">{ticket.category}</Td>
                <Td>
                  <span
                    className={campaignStatusClass(
                      (ticket.status === 'Resolved' ? 'Completed' : 'Under Review') as CampaignStatus,
                    )}
                  >
                    {ticket.status}
                  </span>
                </Td>
                <Td className="text-muted">{ticket.updated}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Card>
    </PageLayout>
  )
}
