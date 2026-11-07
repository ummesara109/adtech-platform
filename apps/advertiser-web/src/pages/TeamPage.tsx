import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { Callout } from '../components/ui/Callout'
import { Card, CardHeader } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { PageLayout } from '../components/ui/PageLayout'
import { TableHead, TableShell, Td, Th } from '../components/ui/TableShell'
import { useAdvertiser } from '../context/AdvertiserContext'
import {
  ensureTeamWorkspace,
  inviteTeamMember,
  removeTeamMember,
  setTeamMemberStatus,
  updateTeamMemberRole,
  type StoredTeamMember,
} from '../lib/teamMembers'
import {
  accessLabel,
  initialsFromName,
  memberStatusClass,
  permissionSections,
  roleAccess,
  roleDescriptions,
  teamRoles,
  type TeamMemberStatus,
  type TeamRole,
} from '../lib/teamRoles'

type StatusFilter = 'all' | TeamMemberStatus
type DialogState =
  | { type: 'none' }
  | { type: 'details'; member: StoredTeamMember }
  | { type: 'role'; member: StoredTeamMember; nextRole: TeamRole }
  | { type: 'deactivate'; member: StoredTeamMember }
  | { type: 'remove'; member: StoredTeamMember }

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint: string
}) {
  return (
    <article className="rounded-2xl border border-navy/[0.06] bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-navy">{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-muted">{hint}</p>
    </article>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy/8 text-xs font-bold text-navy"
      aria-hidden
    >
      {initialsFromName(name)}
    </span>
  )
}

function MenuItem({
  label,
  onClick,
  danger,
  disabled,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={`block w-full px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? 'font-semibold text-rose-700 hover:bg-rose-50' : 'text-navy hover:bg-paper'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function InviteModal({
  open,
  existingEmails,
  onClose,
  onInvite,
}: {
  open: boolean
  existingEmails: string[]
  onClose: () => void
  onInvite: (input: { name: string; email: string; role: TeamRole }) => string | null
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamRole>('Viewer')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setEmail('')
    setRole('Viewer')
    setError(null)
    setSuccess(null)
  }, [open])

  if (!open) return null

  function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    const trimmedEmail = email.trim().toLowerCase()
    if (!name.trim()) {
      setError('Enter a full name.')
      return
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    if (existingEmails.includes(trimmedEmail)) {
      setError('A member with this email already exists in this workspace.')
      return
    }
    const fail = onInvite({ name: name.trim(), email: trimmedEmail, role })
    if (fail) {
      setError(fail)
      return
    }
    setSuccess(
      `Invitation saved locally for ${trimmedEmail}. No email was sent — this is a frontend-only demo action.`,
    )
    setName('')
    setEmail('')
    setRole('Viewer')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-member-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90svh] w-full max-w-md overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
      <Card padding="md" className="!p-5 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="invite-member-title" className="text-lg font-bold text-navy">
              Invite member
            </h2>
            <p className="mt-1 text-sm text-muted">
              Add a teammate to this advertiser workspace. Invitations are stored locally until NestJS team invites
              are connected.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={submit}>
          <label className="block text-xs font-semibold text-muted">
            Full name
            <input
              className="mt-1 block w-full rounded-xl border border-navy/12 bg-white px-3 py-2 text-sm text-navy"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Email address
            <input
              type="email"
              className="mt-1 block w-full rounded-xl border border-navy/12 bg-white px-3 py-2 text-sm text-navy"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Role
            <select
              className="mt-1 block w-full rounded-xl border border-navy/12 bg-white px-3 py-2 text-sm text-navy"
              value={role}
              onChange={(event) => setRole(event.target.value as TeamRole)}
            >
              {teamRoles.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <p className="rounded-xl bg-paper/80 px-3 py-2 text-[11px] leading-snug text-muted">
            {roleDescriptions[role]}
          </p>

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-xl border border-teal/25 bg-teal-muted/30 px-3 py-2 text-sm text-navy" role="status">
              {success}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Send Invitation
            </Button>
          </div>
        </form>
      </Card>
      </div>
    </div>
  )
}

function accessTone(level: ReturnType<typeof roleAccess>): string {
  switch (level) {
    case 'Full':
      return 'bg-emerald-50 text-emerald-900'
    case 'Edit':
      return 'bg-sky-50 text-sky-900'
    case 'View':
      return 'bg-paper text-muted'
    default:
      return 'bg-stone-100 text-stone-400'
  }
}

export function TeamPage() {
  const { account, profile } = useAdvertiser()
  const advertiserKey = profile.contactEmail || account.companyName || account.fullName || 'local-advertiser'
  const ownerName = profile.contactName || account.fullName || 'Account owner'
  const ownerEmail = (profile.contactEmail || 'owner@local').toLowerCase()

  const [members, setMembers] = useState<StoredTeamMember[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' })
  const [flash, setFlash] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  function reload() {
    setMembers(ensureTeamWorkspace(advertiserKey, { name: ownerName, email: ownerEmail }))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when workspace identity changes
  }, [advertiserKey, ownerEmail, ownerName])

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuId(null)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  const overview = useMemo(() => {
    const total = members.length
    const active = members.filter((m) => m.status === 'Active').length
    const pending = members.filter((m) => m.status === 'Pending').length
    return { total, active, pending }
  }, [members])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false
      if (!q) return true
      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    })
  }, [members, query, statusFilter])

  const existingEmails = useMemo(() => members.map((m) => m.email.toLowerCase()), [members])
  const hasDemo = members.some((m) => m.isDemo)

  function handleInvite(input: { name: string; email: string; role: TeamRole }): string | null {
    const result = inviteTeamMember(advertiserKey, input)
    if (!result.ok) return result.error
    reload()
    setFlash(`Local invitation created for ${result.member.email}. No email was sent.`)
    return null
  }

  function confirmDialog() {
    if (dialog.type === 'role') {
      const result = updateTeamMemberRole(advertiserKey, dialog.member.id, dialog.nextRole)
      if (!result.ok) setFlash(result.error)
      else setFlash(`Role updated to ${dialog.nextRole} (local workspace only — not enforced yet).`)
      reload()
    }
    if (dialog.type === 'deactivate') {
      const result = setTeamMemberStatus(advertiserKey, dialog.member.id, 'Deactivated')
      if (!result.ok) setFlash(result.error)
      else setFlash(`${dialog.member.name} deactivated locally.`)
      reload()
    }
    if (dialog.type === 'remove') {
      const result = removeTeamMember(advertiserKey, dialog.member.id)
      if (!result.ok) setFlash(result.error)
      else setFlash(`${dialog.member.name} removed from this local workspace.`)
      reload()
    }
    setDialog({ type: 'none' })
  }

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All Members' },
    { id: 'Active', label: 'Active' },
    { id: 'Pending', label: 'Pending' },
    { id: 'Deactivated', label: 'Deactivated' },
  ]

  let confirmNode: ReactNode = null
  if (dialog.type === 'deactivate') {
    confirmNode = (
      <ConfirmDialog
        open
        title="Deactivate member"
        description={`Deactivate ${dialog.member.name}? They will appear as Deactivated in this local workspace. No real account access is changed yet.`}
        confirmLabel="Deactivate"
        danger
        onConfirm={confirmDialog}
        onCancel={() => setDialog({ type: 'none' })}
      />
    )
  } else if (dialog.type === 'remove') {
    confirmNode = (
      <ConfirmDialog
        open
        title="Remove access"
        description={`Remove ${dialog.member.name} (${dialog.member.email}) from this workspace? This deletes the local team row only.`}
        confirmLabel="Remove access"
        danger
        onConfirm={confirmDialog}
        onCancel={() => setDialog({ type: 'none' })}
      />
    )
  }

  return (
    <PageLayout className="max-w-[88rem] space-y-6">
      <PageHeader
        title="Team"
        description="Manage your company members and their access to AutoAds."
        actions={
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            Invite Member
          </Button>
        }
      />

      <Callout variant="measurement">
        Team membership is stored in this browser for frontend testing. Invitations do not send email, and roles are
        not enforced until NestJS guards and Supabase Auth are connected.
        {hasDemo ? ' Sample members are labelled [TEST] / Demo.' : ''}
      </Callout>

      {flash ? (
        <p className="rounded-xl border border-teal/25 bg-teal-muted/30 px-4 py-3 text-sm text-navy" role="status">
          {flash}
          <button type="button" className="ml-3 text-xs font-semibold text-teal underline" onClick={() => setFlash(null)}>
            Dismiss
          </button>
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total Members" value={overview.total} hint="Everyone listed for this advertiser workspace" />
        <SummaryCard label="Active Members" value={overview.active} hint="Accepted membership · local status only" />
        <SummaryCard label="Pending Invitations" value={overview.pending} hint="Awaiting acceptance · no email sent" />
      </section>

      <Card padding="md">
        <CardHeader
          title="Team members"
          description="Search and filter people with access to this advertiser company"
        />

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="min-w-[14rem] flex-1 text-xs font-semibold text-muted">
            Search
            <input
              type="search"
              placeholder="Name or email…"
              className="mt-1 block w-full rounded-xl border border-navy/12 bg-white px-3 py-2 text-sm text-navy"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Member status filter">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={statusFilter === tab.id}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  statusFilter === tab.id
                    ? 'bg-navy text-white'
                    : 'border border-navy/12 bg-white text-navy hover:border-navy/25'
                }`}
                onClick={() => setStatusFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={members.length === 0 ? 'No teammates yet' : 'No matching members'}
            description={
              members.length === 0
                ? 'Invite your first teammate to collaborate on campaigns and billing.'
                : 'Try another search or status filter.'
            }
            action={
              members.length === 0 ? (
                <Button size="sm" onClick={() => setInviteOpen(true)}>
                  Invite Member
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableShell minWidth="920px">
            <TableHead>
              <tr>
                <Th>Member</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Date added</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </TableHead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id} className="hover:bg-paper/80">
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={member.name} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-navy">{member.name}</p>
                        <div className="mt-0.5 flex flex-wrap gap-1.5">
                          {member.isOwner ? (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-teal">Owner</span>
                          ) : null}
                          {member.isDemo ? (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                              Demo
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-sm text-muted">{member.email}</Td>
                  <Td>
                    <span className="inline-flex rounded-full bg-navy/8 px-2.5 py-0.5 text-xs font-semibold text-navy">
                      {member.role}
                    </span>
                  </Td>
                  <Td>
                    <span className={memberStatusClass(member.status)}>{member.status}</span>
                  </Td>
                  <Td className="tabular-nums text-muted">{member.addedOn || '—'}</Td>
                  <Td className="text-right">
                    <div className="relative inline-block" ref={menuId === member.id ? menuRef : undefined}>
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-lg leading-none text-navy hover:bg-paper"
                        aria-label={`Actions for ${member.name}`}
                        aria-expanded={menuId === member.id}
                        onClick={() => setMenuId((id) => (id === member.id ? null : member.id))}
                      >
                        ⋯
                      </button>
                      {menuId === member.id ? (
                        <div
                          role="menu"
                          className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-navy/10 bg-white py-1 shadow-[var(--shadow-elevated)]"
                        >
                          <MenuItem
                            label="View details"
                            onClick={() => {
                              setMenuId(null)
                              setDialog({ type: 'details', member })
                            }}
                          />
                          <MenuItem
                            label="Change role"
                            disabled={Boolean(member.isOwner)}
                            onClick={() => {
                              setMenuId(null)
                              setDialog({ type: 'role', member, nextRole: member.role })
                            }}
                          />
                          <MenuItem
                            label="Deactivate"
                            disabled={Boolean(member.isOwner) || member.status === 'Deactivated'}
                            onClick={() => {
                              setMenuId(null)
                              setDialog({ type: 'deactivate', member })
                            }}
                          />
                          <MenuItem
                            label="Remove access"
                            danger
                            disabled={Boolean(member.isOwner)}
                            onClick={() => {
                              setMenuId(null)
                              setDialog({ type: 'remove', member })
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      <Card padding="md">
        <CardHeader
          title="Permissions overview"
          description="Intended access by role — not enforced in this frontend. NestJS + RLS will apply real authorization later."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-navy/[0.08] text-[10px] font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2.5 pr-3">Section</th>
                {teamRoles.map((role) => (
                  <th key={role} className="px-2 py-2.5 text-center">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/[0.06]">
              {permissionSections.map((section) => (
                <tr key={section}>
                  <td className="py-2.5 pr-3 font-semibold text-navy">{section}</td>
                  {teamRoles.map((role) => {
                    const level = roleAccess(role, section)
                    return (
                      <td key={role} className="px-2 py-2.5 text-center">
                        <span
                          className={`inline-flex min-w-[3.25rem] justify-center rounded-lg px-2 py-1 text-[11px] font-semibold ${accessTone(level)}`}
                        >
                          {accessLabel(level)}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {teamRoles.map((role) => (
            <li key={role} className="rounded-xl border border-navy/[0.06] bg-paper/60 px-3 py-2.5">
              <p className="text-sm font-semibold text-navy">{role}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted">{roleDescriptions[role]}</p>
            </li>
          ))}
        </ul>
      </Card>

      <InviteModal
        open={inviteOpen}
        existingEmails={existingEmails}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
      />

      {dialog.type === 'details' ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-details-title"
          onClick={() => setDialog({ type: 'none' })}
        >
          <div className="w-full max-w-md" onClick={(event) => event.stopPropagation()}>
          <Card padding="md" className="!p-5 shadow-[var(--shadow-elevated)]">
            <div className="flex items-start gap-3">
              <Avatar name={dialog.member.name} />
              <div className="min-w-0 flex-1">
                <h2 id="member-details-title" className="text-lg font-bold text-navy">
                  {dialog.member.name}
                </h2>
                <p className="text-sm text-muted">{dialog.member.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDialog({ type: 'none' })}>
                Close
              </Button>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3 border-b border-navy/[0.06] pb-2">
                <dt className="text-muted">Role</dt>
                <dd className="font-semibold text-navy">{dialog.member.role}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-navy/[0.06] pb-2">
                <dt className="text-muted">Status</dt>
                <dd>
                  <span className={memberStatusClass(dialog.member.status)}>{dialog.member.status}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-navy/[0.06] pb-2">
                <dt className="text-muted">Date added</dt>
                <dd className="tabular-nums text-navy">{dialog.member.addedOn}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Workspace</dt>
                <dd className="text-right text-xs text-muted">
                  {dialog.member.isOwner ? 'Account owner' : dialog.member.isDemo ? 'Demo / local' : 'Local member'}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted">{roleDescriptions[dialog.member.role]}</p>
            {!dialog.member.isOwner ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDialog({ type: 'role', member: dialog.member, nextRole: dialog.member.role })}
                >
                  Change role
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-xs font-medium text-amber-900">
                Owner access cannot be removed or demoted from this screen.
              </p>
            )}
          </Card>
          </div>
        </div>
      ) : null}

      {dialog.type === 'role' ? (
        <ConfirmDialog
          open
          title="Change member role"
          description={`Choose a new role for ${dialog.member.name}, then confirm. Roles are not enforced in the frontend.`}
          confirmLabel="Save role"
          onConfirm={confirmDialog}
          onCancel={() => setDialog({ type: 'none' })}
        >
          <label className="mt-3 block text-xs font-semibold text-muted">
            Role
            <select
              className="mt-1 block w-full rounded-xl border border-navy/12 bg-white px-3 py-2 text-sm text-navy"
              value={dialog.nextRole}
              onChange={(event) =>
                setDialog({ type: 'role', member: dialog.member, nextRole: event.target.value as TeamRole })
              }
            >
              {teamRoles.map((option) => (
                <option key={option} value={option} disabled={Boolean(dialog.member.isOwner) && option !== 'Admin'}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 rounded-xl bg-paper px-3 py-2 text-xs text-muted">{roleDescriptions[dialog.nextRole]}</p>
        </ConfirmDialog>
      ) : null}

      {dialog.type === 'deactivate' || dialog.type === 'remove' ? confirmNode : null}
    </PageLayout>
  )
}
