import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { IconBell, IconChevron, IconSearch } from '../components/dashboard/DashboardIcons'
import { navIconMap } from '../components/icons/NavIcons'
import { ButtonLink } from '../components/ui/Button'
import { useAdvertiser } from '../context/AdvertiserContext'
import { useWorkspace } from '../context/AdvertiserWorkspaceContext'
import { clearAuthSession, loadAuthSession } from '../lib/authSession'
import { appConfig, isApiConfigured } from '../lib/config'
import { formatLongDate } from '../lib/format'
import { advertiserNav } from '../navigation'

export function AdvertiserShell() {
  const { account, profile, resetWorkspace } = useAdvertiser()
  const { data, apiConnected } = useWorkspace()
  const signedIn = Boolean(loadAuthSession()?.accessToken)
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const location = useLocation()
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement>(null)

  const unread = data.notifications.filter((note) => !note.read).length
  const pageTitle = useMemo(() => {
    if (location.pathname === '/dashboard' || location.pathname === '/') return 'Advertiser Dashboard'
    if (location.pathname.startsWith('/notifications')) return 'Notifications'
    const match = advertiserNav.find(
      (item) => item.to !== '/dashboard' && location.pathname.startsWith(item.to),
    )
    return match?.label ?? 'Advertiser workspace'
  }, [location.pathname])

  useEffect(() => {
    setOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    setSearch(searchParams.get('q') ?? '')
  }, [searchParams])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const q = search.trim()
    navigate(q ? `/dashboard?q=${encodeURIComponent(q)}` : '/dashboard')
  }

  function logOut() {
    clearAuthSession()
    resetWorkspace()
    setMenuOpen(false)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-svh bg-paper text-ink lg:grid lg:grid-cols-[280px_1fr]">
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-navy/10 bg-navy px-4 py-3 text-white lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-auto text-sm font-bold text-navy">A</span>
          <p className="truncate text-sm font-semibold">{appConfig.appName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/notifications"
            className="relative rounded-lg border border-white/20 p-2"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          >
            <IconBell />
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-auto px-1 text-[10px] font-bold text-navy">
                {unread}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            Menu
          </button>
        </div>
      </header>

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(280px,88vw)] flex-col bg-navy text-white shadow-[var(--shadow-elevated)] transition-transform duration-200 lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${open ? 'flex' : 'hidden lg:flex'}`}
      >
        <div className="border-b border-white/10 px-5 py-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-auto to-auto-dark text-lg font-bold text-navy shadow-sm">
              A
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-auto/90">Auto-rickshaw DOOH</p>
              <h1 className="text-base font-bold leading-tight">{appConfig.appName}</h1>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/55">Advertiser portal · {appConfig.city}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Advertiser">
          {advertiserNav.map((item) => {
            const Icon = navIconMap[item.icon]
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-white/12 text-white ring-1 ring-white/10'
                      : 'text-white/75 hover:bg-white/8 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isActive ? 'bg-auto text-navy' : 'bg-white/8 text-white/90'
                      }`}
                    >
                      <Icon />
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-xl bg-white/8 p-3 ring-1 ring-white/10">
            <p className="truncate text-sm font-semibold">{account.companyName}</p>
            <p className="truncate text-xs text-white/60">{account.fullName}</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:col-start-2">
        <div className="sticky top-0 z-20 hidden items-center gap-4 border-b border-navy/[0.06] bg-card/90 px-6 py-3 backdrop-blur-md lg:flex">
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-navy">{pageTitle}</p>
            <p className="truncate text-xs text-muted">
              {account.companyName} · {formatLongDate()}
            </p>
          </div>

          <form onSubmit={submitSearch} className="relative mx-auto w-full max-w-md">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search campaigns or Bengaluru locations"
              className="h-10 w-full rounded-xl border border-navy/12 bg-paper/70 pl-10 pr-3 text-sm text-navy outline-none transition placeholder:text-muted focus:border-teal/40 focus:bg-white"
            />
          </form>

          <div className="flex items-center gap-2">
            <ButtonLink to="/campaigns/create" size="sm">
              + Create campaign
            </ButtonLink>

            <Link
              to="/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-navy/10 bg-white text-navy transition hover:border-navy/20 hover:shadow-sm"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            >
              <IconBell />
              {unread > 0 ? (
                <span className="animate-badge-pop absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-auto px-1 text-[10px] font-bold text-navy">
                  {unread}
                </span>
              ) : null}
            </Link>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className="flex h-10 items-center gap-2 rounded-xl border border-navy/10 bg-white px-2.5 text-left transition hover:border-navy/20 hover:shadow-sm"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy text-xs font-bold text-auto">
                  {account.companyName.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-[9rem] truncate text-xs font-semibold text-navy xl:block">
                  {account.companyName}
                </span>
                <IconChevron className="text-muted" />
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-72 rounded-2xl border border-navy/10 bg-white p-3 shadow-[var(--shadow-elevated)]"
                >
                  <p className="text-sm font-semibold text-navy">{account.companyName}</p>
                  <p className="mt-0.5 text-xs text-muted">{account.fullName}</p>
                  <p className="text-xs text-muted">{profile.contactEmail || 'Add a contact email in Settings'}</p>
                  <div className="mt-3 flex flex-col gap-1 border-t border-navy/8 pt-2">
                    <Link
                      to="/settings"
                      className="rounded-lg px-2 py-2 text-sm font-medium text-navy transition hover:bg-paper"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      Company Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="rounded-lg px-2 py-2 text-sm font-medium text-navy transition hover:bg-paper"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      Account Settings
                    </Link>
                    <Link
                      to="/notifications"
                      className="rounded-lg px-2 py-2 text-sm font-medium text-navy transition hover:bg-paper"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      Notifications
                    </Link>
                    <button
                      type="button"
                      onClick={logOut}
                      className="rounded-lg px-2 py-2 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                      role="menuitem"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="pb-24 lg:min-h-[calc(100svh-4rem)] lg:bg-[linear-gradient(180deg,var(--color-paper)_0%,#e8eef4_100%)] lg:pb-8">
          {isApiConfigured() && !signedIn ? (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:px-6">
              <div className="mx-auto flex max-w-[88rem] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium">
                  Manager demo: sign in to load real company campaigns from Postgres (not browser sample data).
                </p>
                <ButtonLink to="/settings" size="sm" variant="secondary">
                  Sign in · live@autoads.test
                </ButtonLink>
              </div>
            </div>
          ) : null}
          {apiConnected ? (
            <div className="border-b border-teal/20 bg-teal-muted/40 px-4 py-2 text-xs text-navy sm:px-6">
              <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-3">
                <p>
                  <span className="font-semibold text-teal">Live API</span>
                  <span className="text-muted"> · {account.companyName} workspace from NestJS + database</span>
                </p>
              </div>
            </div>
          ) : null}
          <Outlet />
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-20 lg:hidden">
        <ButtonLink to="/campaigns/create" size="md" className="shadow-[var(--shadow-elevated)]">
          + Campaign
        </ButtonLink>
      </div>
    </div>
  )
}
