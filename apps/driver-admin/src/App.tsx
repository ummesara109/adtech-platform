import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken } from './api'

type DriverRow = {
  id: string
  email: string
  fullName: string
  phone: string
  accountStatus: string
  kycStatus: string
  vehicle: { id: string; registrationNumber: string; status: string; vehicleType: string } | null
  device: { serialNumber: string; onlineStatus: string; pairingStatus: string } | null
  documentsUploaded: number
  documentsTotal: number
  supportOpen: number
  playbackCount: number
}

type SupportRow = {
  id: string
  subject: string
  description: string
  status: string
  createdAt: string
  driverId: string
  driverName: string
  driverEmail: string
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('admin@autoads.test')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api<{ accessToken: string }>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setToken(res.accessToken)
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>Partner Admin</h1>
        <p className="muted">Approve KYC, vehicles, simulate devices, manage tickets.</p>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error ? <div className="error">{error}</div> : null}
        <div style={{ marginTop: 16 }}>
          <button className="btn" disabled={loading} type="submit">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  )
}

function DriversPage() {
  const [items, setItems] = useState<DriverRow[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [serial, setSerial] = useState('AUTADS-SIM-001')
  const [selected, setSelected] = useState<string>('')

  async function load() {
    try {
      const res = await api<{ items: DriverRow[] }>('/admin/drivers')
      setItems(res.items)
      if (!selected && res.items[0]) setSelected(res.items[0].id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const stats = useMemo(() => {
    return {
      total: items.length,
      kycReview: items.filter((d) => d.kycStatus === 'UnderReview' || d.kycStatus === 'Pending').length,
      vehiclePending: items.filter((d) => d.vehicle?.status === 'Pending').length,
      online: items.filter((d) => d.device?.onlineStatus === 'Online').length,
    }
  }, [items])

  async function reviewKyc(id: string, decision: 'approve' | 'reject') {
    setBusy(id)
    try {
      await api(`/admin/drivers/${id}/kyc/review`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'KYC review failed')
    } finally {
      setBusy(null)
    }
  }

  async function reviewVehicle(vehicleId: string, decision: 'approve' | 'reject') {
    setBusy(vehicleId)
    try {
      await api(`/admin/vehicles/${vehicleId}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vehicle review failed')
    } finally {
      setBusy(null)
    }
  }

  async function issuePairing() {
    if (!selected) return
    setBusy('pair')
    try {
      const res = await api<{ pairingCode: string }>('/admin/devices/issue-pairing', {
        method: 'POST',
        body: JSON.stringify({ driverId: selected, serialNumber: serial }),
      })
      alert(`Pairing code: ${res.pairingCode}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Issue pairing failed')
    } finally {
      setBusy(null)
    }
  }

  async function simulate() {
    if (!selected) return
    setBusy('sim')
    try {
      await api('/admin/devices/simulate', {
        method: 'POST',
        body: JSON.stringify({ driverId: selected, playbackSeconds: 120, signalStrength: -60 }),
      })
      await api(`/admin/drivers/${selected}/earnings/recalculate`, { method: 'POST', body: '{}' })
      await api(`/admin/drivers/${selected}/incentives/evaluate`, { method: 'POST', body: '{}' })
      await load()
      alert('Simulator ran: online heartbeat + 120s playback + earnings/incentives refresh')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulate failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <h2>Drivers</h2>
      {error ? <div className="error">{error}</div> : null}
      <div className="grid">
        <div className="stat">
          Total partners<strong>{stats.total}</strong>
        </div>
        <div className="stat">
          KYC queue<strong>{stats.kycReview}</strong>
        </div>
        <div className="stat">
          Vehicles pending<strong>{stats.vehiclePending}</strong>
        </div>
        <div className="stat">
          Devices online<strong>{stats.online}</strong>
        </div>
      </div>

      <div className="card">
        <h3>Device ops / simulator</h3>
        <div className="row">
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {items.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} ({d.email})
              </option>
            ))}
          </select>
          <input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="Device serial" />
          <button className="btn secondary" disabled={busy === 'pair'} onClick={() => void issuePairing()}>
            Issue pairing code
          </button>
          <button className="btn" disabled={busy === 'sim'} onClick={() => void simulate()}>
            Simulate activity
          </button>
        </div>
        <p className="muted">
          Simulator writes telemetry + playback. Replace with MQTT/hardware ingestion later — same DB models.
        </p>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Driver</th>
              <th>KYC</th>
              <th>Vehicle</th>
              <th>Device</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id}>
                <td>
                  <strong>{d.fullName}</strong>
                  <div className="muted">{d.email}</div>
                  <div className="muted">{d.phone || '—'}</div>
                </td>
                <td>
                  <span className={`badge ${d.kycStatus === 'Verified' ? 'ok' : d.kycStatus === 'Rejected' ? 'bad' : 'warn'}`}>
                    {d.kycStatus}
                  </span>
                  <div className="muted">
                    Docs {d.documentsUploaded}/{d.documentsTotal}
                  </div>
                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="btn" disabled={!!busy} onClick={() => void reviewKyc(d.id, 'approve')}>
                      Approve
                    </button>
                    <button className="btn ghost" disabled={!!busy} onClick={() => void reviewKyc(d.id, 'reject')}>
                      Reject
                    </button>
                  </div>
                </td>
                <td>
                  {d.vehicle ? (
                    <>
                      <div>{d.vehicle.registrationNumber}</div>
                      <span className={`badge ${d.vehicle.status === 'Active' ? 'ok' : 'warn'}`}>{d.vehicle.status}</span>
                      <div className="row" style={{ marginTop: 8 }}>
                        <button
                          className="btn"
                          disabled={!!busy}
                          onClick={() => void reviewVehicle(d.vehicle!.id, 'approve')}
                        >
                          Activate
                        </button>
                        <button
                          className="btn ghost"
                          disabled={!!busy}
                          onClick={() => void reviewVehicle(d.vehicle!.id, 'reject')}
                        >
                          Deactivate
                        </button>
                      </div>
                    </>
                  ) : (
                    <span className="muted">None</span>
                  )}
                </td>
                <td>
                  {d.device ? (
                    <>
                      <div>{d.device.serialNumber}</div>
                      <span className={`badge ${d.device.onlineStatus === 'Online' ? 'ok' : 'bad'}`}>
                        {d.device.onlineStatus}
                      </span>
                      <div className="muted">{d.device.pairingStatus}</div>
                    </>
                  ) : (
                    <span className="muted">Unassigned</span>
                  )}
                  <div className="muted">Playbacks: {d.playbackCount}</div>
                </td>
                <td>
                  <button className="btn ghost" onClick={() => setSelected(d.id)}>
                    Select for ops
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SupportPage() {
  const [items, setItems] = useState<SupportRow[]>([])
  const [error, setError] = useState('')

  async function load() {
    try {
      const res = await api<{ items: SupportRow[] }>('/admin/support/issues')
      setItems(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function setStatus(id: string, status: string) {
    try {
      await api(`/admin/support/issues/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  return (
    <div>
      <h2>Support tickets</h2>
      {error ? <div className="error">{error}</div> : null}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Driver</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id}>
                <td>
                  <strong>{t.driverName}</strong>
                  <div className="muted">{t.driverEmail}</div>
                </td>
                <td>
                  <div>{t.subject}</div>
                  <div className="muted">{t.description}</div>
                  <div className="muted">{new Date(t.createdAt).toLocaleString()}</div>
                </td>
                <td>
                  <span className="badge warn">{t.status}</span>
                </td>
                <td className="row">
                  <button className="btn" onClick={() => void setStatus(t.id, 'InProgress')}>
                    In progress
                  </button>
                  <button className="btn secondary" onClick={() => void setStatus(t.id, 'Resolved')}>
                    Resolve
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  No tickets yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Shell({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Auto Ad Partner</h1>
        <p>Operations admin</p>
        <nav>
          <NavLink to="/" end>
            Drivers
          </NavLink>
          <NavLink to="/support">Support</NavLink>
          <button className="linkish" onClick={onLogout}>
            Sign out
          </button>
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<DriversPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()))
  const navigate = useNavigate()

  if (!authed) {
    return (
      <LoginPage
        onLogin={() => {
          setAuthed(true)
          navigate('/')
        }}
      />
    )
  }

  return (
    <Shell
      onLogout={() => {
        setToken(null)
        setAuthed(false)
      }}
    />
  )
}
