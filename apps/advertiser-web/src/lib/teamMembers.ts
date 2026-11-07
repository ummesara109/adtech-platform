/**
 * Advertiser-scoped team members (frontend-only until NestJS team API exists).
 */

import {
  type TeamMemberStatus,
  type TeamRole,
} from './teamRoles'

const TEAM_KEY = 'autoads.advertiser.team'

export type StoredTeamMember = {
  id: string
  advertiserKey: string
  name: string
  email: string
  role: TeamRole
  status: TeamMemberStatus
  addedOn: string
  isOwner?: boolean
  isDemo?: boolean
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function loadTeamMembers(advertiserKey: string): StoredTeamMember[] {
  return readJson<StoredTeamMember[]>(TEAM_KEY, []).filter((row) => row.advertiserKey === advertiserKey)
}

export function saveTeamMembers(advertiserKey: string, members: StoredTeamMember[]) {
  const others = readJson<StoredTeamMember[]>(TEAM_KEY, []).filter((row) => row.advertiserKey !== advertiserKey)
  writeJson(TEAM_KEY, [...members.map((m) => ({ ...m, advertiserKey })), ...others])
}

function displayDate(d = new Date()) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Ensures the workspace owner exists; seeds labelled demo members on first visit. */
export function ensureTeamWorkspace(
  advertiserKey: string,
  owner: { name: string; email: string },
): StoredTeamMember[] {
  let members = loadTeamMembers(advertiserKey)
  const ownerEmail = (owner.email || 'owner@local').trim().toLowerCase()
  const ownerName = owner.name.trim() || 'Account owner'

  if (!members.some((m) => m.isOwner)) {
    const byEmail = members.find((m) => m.email.toLowerCase() === ownerEmail)
    if (byEmail) {
      members = members.map((m) =>
        m.id === byEmail.id ? { ...m, isOwner: true, status: 'Active' as const, role: 'Admin' as const } : m,
      )
    } else {
      members = [
        {
          id: `owner-${advertiserKey.slice(0, 12)}`,
          advertiserKey,
          name: ownerName,
          email: ownerEmail,
          role: 'Admin',
          status: 'Active',
          addedOn: displayDate(),
          isOwner: true,
          isDemo: false,
        },
        ...members,
      ]
    }
  }

  // Do not auto-seed fake teammates — production demos should show owner only until Team API ships.
  saveTeamMembers(advertiserKey, members)
  return members
}

export function inviteTeamMember(
  advertiserKey: string,
  input: { name: string; email: string; role: TeamRole },
): { ok: true; member: StoredTeamMember } | { ok: false; error: string } {
  const members = loadTeamMembers(advertiserKey)
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()

  if (!name) return { ok: false, error: 'Enter a full name.' }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Enter a valid email address.' }
  }
  if (members.some((m) => m.email.toLowerCase() === email)) {
    return { ok: false, error: 'A member with this email already exists in this workspace.' }
  }

  const member: StoredTeamMember = {
    id: `TM-L-${Date.now().toString(36).toUpperCase()}`,
    advertiserKey,
    name,
    email,
    role: input.role,
    status: 'Pending',
    addedOn: displayDate(),
    isDemo: true,
  }
  saveTeamMembers(advertiserKey, [member, ...members])
  return { ok: true, member }
}

export function updateTeamMemberRole(
  advertiserKey: string,
  memberId: string,
  role: TeamRole,
): { ok: true } | { ok: false; error: string } {
  const members = loadTeamMembers(advertiserKey)
  const target = members.find((m) => m.id === memberId)
  if (!target) return { ok: false, error: 'Member not found.' }
  if (target.isOwner && role !== 'Admin') {
    return { ok: false, error: 'The account owner must keep the Admin role.' }
  }
  saveTeamMembers(
    advertiserKey,
    members.map((m) => (m.id === memberId ? { ...m, role } : m)),
  )
  return { ok: true }
}

export function setTeamMemberStatus(
  advertiserKey: string,
  memberId: string,
  status: TeamMemberStatus,
): { ok: true } | { ok: false; error: string } {
  const members = loadTeamMembers(advertiserKey)
  const target = members.find((m) => m.id === memberId)
  if (!target) return { ok: false, error: 'Member not found.' }
  if (target.isOwner) return { ok: false, error: 'You cannot deactivate or remove the account owner.' }
  saveTeamMembers(
    advertiserKey,
    members.map((m) => (m.id === memberId ? { ...m, status } : m)),
  )
  return { ok: true }
}

export function removeTeamMember(
  advertiserKey: string,
  memberId: string,
): { ok: true } | { ok: false; error: string } {
  const members = loadTeamMembers(advertiserKey)
  const target = members.find((m) => m.id === memberId)
  if (!target) return { ok: false, error: 'Member not found.' }
  if (target.isOwner) return { ok: false, error: 'You cannot remove the account owner.' }
  saveTeamMembers(
    advertiserKey,
    members.filter((m) => m.id !== memberId),
  )
  return { ok: true }
}
