import { FormEvent, useEffect, useState } from 'react'
import { AutoRickshawSmall, DeviceBox } from '../components/Illustrations'
import { driverApi } from '../lib/api'
import { useAuth } from '../lib/auth'

function Field({
  icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  right,
}: {
  icon: string
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  right?: React.ReactNode
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
      <span className="text-[13px] text-[#0b2a6b]">{icon}</span>
      <input
        className="w-full bg-transparent text-[11px] outline-none placeholder:text-slate-400"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {right}
    </div>
  )
}

export function DriverRegistrationScreen() {
  const { register, login, user } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function onRegister(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      await register({ fullName, email, phone })
      setMsg('Registered and signed in.')
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  async function onLogin() {
    setBusy(true)
    setErr(null)
    try {
      await login(email || 'driver@autoads.test')
      setMsg('Signed in.')
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="bg-[#0b2a6b] px-3 pb-8 pt-6 text-center text-white">
        <div className="text-[15px] font-extrabold tracking-tight">Auto Ad Partner</div>
        <div className="mt-1 text-[10px] text-blue-100">Driver registration</div>
      </div>
      <div className="-mt-4 flex-1 rounded-t-2xl bg-white px-3 pt-4">
        <AutoRickshawSmall className="mx-auto mb-2 h-14 w-20" />
        <form onSubmit={onRegister}>
          <Field icon="👤" placeholder="Full Name" value={fullName} onChange={setFullName} />
          <Field icon="📱" placeholder="Mobile Number" value={phone} onChange={setPhone} />
          <Field icon="✉️" placeholder="Email Address" value={email} onChange={setEmail} />
          <Field
            icon="🔒"
            type={showPw ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={setPassword}
            right={
              <button type="button" className="text-[11px] text-[#0b2a6b]" onClick={() => setShowPw((v) => !v)}>
                {showPw ? 'Hide' : '👁'}
              </button>
            }
          />
          {err ? <p className="mb-2 text-[10px] text-red-600">{err}</p> : null}
          {msg ? <p className="mb-2 text-[10px] text-green-600">{msg}</p> : null}
          {user ? <p className="mb-2 text-[10px] text-[#0b2a6b]">Hi {user.fullName}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="mt-1 w-full rounded-full bg-[#f5c518] py-2.5 text-[12px] font-extrabold text-[#0b2a6b] shadow disabled:opacity-60"
          >
            {busy ? 'Please wait…' : 'Register'}
          </button>
        </form>
        <button type="button" onClick={onLogin} className="mt-3 w-full text-center text-[10px] text-[#0b2a6b]">
          Already have an account? <span className="font-bold underline">Login</span>
        </button>
      </div>
    </div>
  )
}

export function KycVerificationScreen() {
  const { token } = useAuth()
  const [docs, setDocs] = useState<{ id: string; label: string; status: string; uploaded: boolean }[]>([])
  const [step, setStep] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    void driverApi.kyc().then((r) => setDocs(r.documents)).catch((e) => setErr(String(e.message || e)))
  }, [token])

  async function onFile(file: File | null) {
    if (!file || !docs[step]) return
    setErr(null)
    const key = `kyc/${docs[step].id}/${file.name}`
    try {
      await driverApi.uploadKyc(docs[step].id, key)
      setPreview(URL.createObjectURL(file))
      setOk(`${docs[step].label} uploaded`)
      const refreshed = await driverApi.kyc()
      setDocs(refreshed.documents)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  async function next() {
    if (step < Math.min(2, docs.length - 1)) {
      setStep((s) => s + 1)
      setPreview(null)
      setOk(null)
      return
    }
    try {
      await driverApi.submitKyc()
      setOk('KYC submitted for review')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Submit failed')
    }
  }

  if (!token) {
    return <EmptyAuth message="Sign in on Registration to manage KYC." />
  }

  return (
    <div className="flex h-full flex-col px-3 pt-6">
      <div className="mb-3 flex items-center justify-between px-2">
        {['ID', 'Photo', 'Address'].map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                i <= step || docs[i]?.uploaded ? 'bg-green-500' : 'bg-slate-300'
              }`}
            >
              {i < step || docs[i]?.uploaded ? '✓' : i + 1}
            </div>
            <span className="text-[8px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
      <h3 className="mb-2 text-center text-[13px] font-extrabold text-[#0b2a6b]">
        Upload Your {docs[step]?.label || 'ID Proof'}
      </h3>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#93c5fd] bg-[#eff6ff] px-3 py-6 text-center">
        <div className="text-2xl text-[#0b2a6b]">⬆</div>
        <div className="mt-1 text-[10px] font-semibold text-[#0b2a6b]">JPG / PNG</div>
        <input
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0] || null)}
        />
      </label>
      {preview ? (
        <div className="relative mt-3 overflow-hidden rounded-xl border border-slate-200">
          <img src={preview} alt="Preview" className="h-24 w-full object-cover" />
          <span className="absolute right-2 top-2 rounded-full bg-green-500 px-1.5 text-[10px] text-white">✓</span>
        </div>
      ) : null}
      {err ? <p className="mt-2 text-[10px] text-red-600">{err}</p> : null}
      {ok ? <p className="mt-2 text-[10px] text-green-600">{ok}</p> : null}
      <button
        type="button"
        onClick={() => void next()}
        className="mt-auto mb-3 w-full rounded-full bg-[#f5c518] py-2.5 text-[12px] font-extrabold text-[#0b2a6b]"
      >
        Next
      </button>
    </div>
  )
}

export function VehicleRegistrationScreen() {
  const { token } = useAuth()
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [vehicleType, setVehicleType] = useState('Auto Rickshaw')
  const [rcStorageKey, setRcStorageKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await driverApi.registerVehicle({ registrationNumber, vehicleType, rcStorageKey })
      setMsg('Vehicle saved')
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  if (!token) return <EmptyAuth message="Sign in to register your vehicle." />

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 bg-[#0b2a6b] px-3 py-3 text-white">
        <span className="text-sm">←</span>
        <span className="text-[12px] font-bold">Vehicle Registration</span>
      </div>
      <form onSubmit={submit} className="flex flex-1 flex-col px-3 pt-3">
        <AutoRickshawSmall className="mx-auto h-16 w-24" />
        <label className="mt-2 text-[10px] font-semibold text-[#0b2a6b]">Vehicle Number</label>
        <input
          className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] uppercase outline-none"
          placeholder="KA01AB1234"
          value={registrationNumber}
          onChange={(e) => setRegistrationNumber(e.target.value)}
        />
        <label className="mt-2 text-[10px] font-semibold text-[#0b2a6b]">Vehicle Type</label>
        <select
          className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] outline-none"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
        >
          <option>Auto Rickshaw</option>
          <option>Cab</option>
        </select>
        <label className="mt-3 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-[#93c5fd] bg-[#eff6ff] py-4">
          <span className="text-[10px] font-semibold text-[#0b2a6b]">Upload RC (PDF, JPG)</span>
          <input
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) setRcStorageKey(`rc/${Date.now()}-${f.name}`)
            }}
          />
          {rcStorageKey ? <span className="mt-1 text-[9px] text-green-600">Ready to save</span> : null}
        </label>
        {err ? <p className="mt-2 text-[10px] text-red-600">{err}</p> : null}
        {msg ? <p className="mt-2 text-[10px] text-green-600">{msg}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-auto mb-3 w-full rounded-full bg-[#f5c518] py-2.5 text-[12px] font-extrabold text-[#0b2a6b]"
        >
          Submit
        </button>
      </form>
    </div>
  )
}

export function DevicePairingScreen() {
  const { token } = useAuth()
  const [code, setCode] = useState('')
  const [displayCode, setDisplayCode] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    void driverApi
      .device()
      .then((r) => {
        const assignment = r.assignment as { pairingCode?: string } | null
        if (assignment?.pairingCode) {
          setDisplayCode(assignment.pairingCode)
          setCode(assignment.pairingCode)
        }
      })
      .catch(() => undefined)
  }, [token])

  async function connect() {
    setErr(null)
    try {
      await driverApi.pairDevice(code)
      setMsg('Device paired')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Pairing failed')
    }
  }

  if (!token) return <EmptyAuth message="Sign in to pair a device." />

  return (
    <div className="flex h-full flex-col px-3 pt-8">
      <DeviceBox className="mx-auto h-20 w-28" />
      <ol className="mt-3 space-y-1 text-[10px] text-slate-600">
        <li>1. Turn on your device</li>
        <li>2. Enter the pairing code</li>
      </ol>
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="text-[28px] font-black tracking-[0.2em] text-[#0b2a6b]">
          {displayCode || code || '————'}
        </div>
        {displayCode ? (
          <button
            type="button"
            className="text-[#1d4ed8]"
            onClick={() => void navigator.clipboard.writeText(displayCode)}
          >
            📋
          </button>
        ) : null}
      </div>
      {!displayCode ? (
        <input
          className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-center text-[12px] tracking-widest"
          placeholder="PAIR-CODE"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      ) : null}
      {err ? <p className="mt-2 text-center text-[10px] text-red-600">{err}</p> : null}
      {msg ? <p className="mt-2 text-center text-[10px] text-green-600">{msg}</p> : null}
      <button
        type="button"
        onClick={() => void connect()}
        className="mt-auto mb-2 w-full rounded-full bg-[#1d4ed8] py-2.5 text-[12px] font-bold text-white"
      >
        Connect Device
      </button>
      <a className="mb-3 text-center text-[10px] text-[#1d4ed8]" href="#support">
        Need Help?
      </a>
    </div>
  )
}

export function DeviceConnectivityScreen() {
  const { token } = useAuth()
  const [assignment, setAssignment] = useState<{
    device?: { serialNumber?: string; onlineStatus?: string }
  } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function refresh() {
    if (!token) return
    try {
      const r = await driverApi.device()
      setAssignment(r.assignment as typeof assignment)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load device')
    }
  }

  useEffect(() => {
    void refresh()
  }, [token])

  async function disconnect() {
    try {
      await driverApi.disconnectDevice()
      setMsg('Device disconnected')
      setAssignment(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Disconnect failed')
    }
  }

  if (!token) return <EmptyAuth message="Sign in to view connectivity." />

  const online = assignment?.device?.onlineStatus === 'Online'

  return (
    <div className="flex h-full flex-col items-center px-3 pt-10 text-center">
      {assignment ? (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
            ✓
          </div>
          <h3 className="mt-3 text-[14px] font-extrabold text-green-600">Device Connected!</h3>
          <p className="mt-1 text-[10px] text-slate-500">
            {online
              ? 'Your device is online and ready to play ads.'
              : 'Assigned device is currently offline.'}
          </p>
          <div className="mt-4 w-full rounded-xl border border-slate-200 bg-[#eff6ff] p-3 text-left text-[10px]">
            <div className="font-semibold text-[#0b2a6b]">ℹ Device ID</div>
            <div className="mt-1 text-slate-700">{assignment.device?.serialNumber || '—'}</div>
            <div className="mt-2 flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          {msg ? <p className="mt-2 text-[10px] text-green-600">{msg}</p> : null}
          {err ? <p className="mt-2 text-[10px] text-red-600">{err}</p> : null}
          <button
            type="button"
            onClick={() => void disconnect()}
            className="mt-auto mb-4 w-full rounded-full border-2 border-[#1d4ed8] py-2 text-[12px] font-bold text-[#1d4ed8]"
          >
            Disconnect
          </button>
        </>
      ) : (
        <div className="mt-10 text-[11px] text-slate-500">
          {err || 'No device assigned. Pair a device first.'}
        </div>
      )}
    </div>
  )
}

function EmptyAuth({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-slate-500">
      {message}
    </div>
  )
}
