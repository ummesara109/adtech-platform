import { FormEvent, useEffect, useState } from 'react'
import { SupportAgent } from '../components/Illustrations'
import { ActivitySummary, driverApi } from '../lib/api'
import { useAuth } from '../lib/auth'

function useActivity() {
  const { token } = useAuth()
  const [data, setData] = useState<ActivitySummary | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    void driverApi
      .activity()
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [token])

  return { data, err, loading, token }
}

function EmptyAuth({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-slate-500">
      {message}
    </div>
  )
}

export function RunningHoursScreen() {
  const { data, err, loading, token } = useActivity()
  if (!token) return <EmptyAuth message="Sign in to view running hours." />
  if (loading) return <Loader />
  if (err) return <ErrorText text={err} />

  const rh = data?.runningHours
  const progress = rh?.totalValidSec != null ? Math.min(1, rh.totalValidSec / (rh.targetHoursPerDay * 3600)) : 0

  return (
    <div className="flex h-full flex-col px-3 pt-7">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 text-[#1d4ed8]">
          <span className="text-lg">📅</span>
          <span className="text-[11px] font-semibold">Today&apos;s Running Time</span>
        </div>
        {!rh?.hasRecords ? (
          <p className="mt-3 text-[11px] text-slate-500">No validated playback recorded today.</p>
        ) : (
          <>
            <div className="mt-2 text-[26px] font-black text-[#0b2a6b]">{rh.totalLabel}</div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-green-500" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="mt-1 text-[9px] text-slate-500">Target: {rh.targetHoursPerDay}h / day</div>
            <ul className="mt-3 space-y-1.5 text-[10px] text-slate-600">
              <li className="flex justify-between">
                <span>Morning</span>
                <span className="font-semibold">{rh.buckets?.morning}</span>
              </li>
              <li className="flex justify-between">
                <span>Afternoon</span>
                <span className="font-semibold">{rh.buckets?.afternoon}</span>
              </li>
              <li className="flex justify-between">
                <span>Evening</span>
                <span className="font-semibold">{rh.buckets?.evening}</span>
              </li>
            </ul>
          </>
        )}
      </div>
      <p className="mt-2 text-center text-[9px] text-slate-400">{data?.reportingDate} · {data?.timeZone}</p>
    </div>
  )
}

export function PlaybackActivityScreen() {
  const { data, err, loading, token } = useActivity()
  if (!token) return <EmptyAuth message="Sign in to view playback." />
  if (loading) return <Loader />
  if (err) return <ErrorText text={err} />

  const pb = data?.playback
  const max = Math.max(1, ...(pb?.weekly.map((d) => d.count) || [1]))

  return (
    <div className="flex h-full flex-col px-3 pt-7">
      <div className="rounded-2xl border border-slate-200 p-3 shadow-sm">
        <div className="flex items-center gap-2 text-[#1d4ed8]">
          <span className="text-lg">▶</span>
          <span className="text-[11px] font-semibold">Total Playbacks</span>
        </div>
        {!pb?.hasRecords || pb.totalCompletedToday == null ? (
          <p className="mt-3 text-[11px] text-slate-500">No playback records available.</p>
        ) : (
          <>
            <div className="mt-1 text-[28px] font-black text-[#0b2a6b]">{pb.totalCompletedToday}</div>
            {pb.vsYesterdayPct != null ? (
              <div className={`text-[10px] font-semibold ${pb.vsYesterdayPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {pb.vsYesterdayPct >= 0 ? '+' : ''}
                {pb.vsYesterdayPct}% vs yesterday
              </div>
            ) : (
              <div className="text-[10px] text-slate-400">No yesterday baseline</div>
            )}
            <div className="mt-4 flex h-24 items-end justify-between gap-1">
              {pb.weekly.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-[#3b82f6]"
                    style={{ height: `${Math.max(6, (d.count / max) * 80)}px` }}
                    title={`${d.count}`}
                  />
                  <span className="text-[8px] text-slate-500">{d.day.slice(0, 2)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function MonthlyEarningsScreen() {
  const { data, err, loading, token } = useActivity()
  const dash = useDashboardNet()
  if (!token) return <EmptyAuth message="Sign in to view earnings." />
  if (loading) return <Loader />
  if (err) return <ErrorText text={err} />

  const trend = data?.earningsTrend || []
  const current = trend[trend.length - 1]
  const previous = trend[trend.length - 2]
  const pct =
    current && previous && previous.netAmountInr > 0
      ? Math.round(((current.netAmountInr - previous.netAmountInr) / previous.netAmountInr) * 100)
      : null
  const maxNet = Math.max(1, ...trend.map((t) => t.netAmountInr))

  return (
    <div className="flex h-full flex-col px-3 pt-7">
      <div className="rounded-2xl border border-slate-200 p-3 shadow-sm">
        <div className="flex items-center gap-2 text-[#1d4ed8]">
          <span className="text-lg">👛</span>
          <span className="text-[11px] font-semibold">This Month</span>
        </div>
        {!current ? (
          <p className="mt-3 text-[11px] text-slate-500">No earnings statement posted yet.</p>
        ) : (
          <>
            <div className="mt-1 text-[26px] font-black text-[#0b2a6b]">
              ₹{current.netAmountInr.toLocaleString('en-IN')}
            </div>
            {previous ? (
              <div className="text-[10px] text-slate-500">
                Last Month: ₹{previous.netAmountInr.toLocaleString('en-IN')}{' '}
                {pct != null ? (
                  <span className={pct >= 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-500'}>
                    {pct >= 0 ? '+' : ''}
                    {pct}%
                  </span>
                ) : null}
              </div>
            ) : null}
            <svg viewBox="0 0 200 70" className="mt-3 h-16 w-full">
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                points={trend
                  .map((t, i) => {
                    const x = trend.length === 1 ? 100 : (i / (trend.length - 1)) * 190 + 5
                    const y = 60 - (t.netAmountInr / maxNet) * 50
                    return `${x},${y}`
                  })
                  .join(' ')}
              />
            </svg>
          </>
        )}
        <button
          type="button"
          className="mt-2 w-full rounded-full bg-[#1d4ed8] py-2 text-[11px] font-bold text-white"
          onClick={() => dash.refresh()}
        >
          View Details
        </button>
        {dash.net != null ? (
          <p className="mt-1 text-center text-[9px] text-slate-400">
            Dashboard net: ₹{dash.net.toLocaleString('en-IN')}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function useDashboardNet() {
  const { token } = useAuth()
  const [net, setNet] = useState<number | null>(null)
  const refresh = () => {
    if (!token) return
    void driverApi.dashboard().then((d) => {
      const v = d.monthlyEarningsInr
      setNet(typeof v === 'number' ? v : null)
    })
  }
  useEffect(() => {
    refresh()
  }, [token])
  return { net, refresh }
}

export function IncentiveManagementScreen() {
  const { data, err, loading, token } = useActivity()
  if (!token) return <EmptyAuth message="Sign in to view incentives." />
  if (loading) return <Loader />
  if (err) return <ErrorText text={err} />

  const bonus = data?.incentives[0]
  const progress = data?.incentiveProgress
  const pct = progress ? Math.min(100, (progress.currentHours / progress.targetHours) * 100) : 0

  return (
    <div className="flex h-full flex-col px-3 pt-7">
      <div className="rounded-2xl border border-slate-200 p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg text-[#f5c518]">🏆</span>
          <span className="text-[11px] font-bold text-[#0b2a6b]">Performance Bonus</span>
        </div>
        <p className="mt-2 text-[11px] font-semibold text-[#0b2a6b]">
          {bonus
            ? `${bonus.title}: Earn extra up to ₹${bonus.amountInr.toLocaleString('en-IN')}!`
            : 'No incentive campaign configured for your account yet.'}
        </p>
        <ul className="mt-3 space-y-1.5 text-[10px] text-slate-600">
          <li className="flex items-start gap-1">
            <span className="text-green-600">✓</span> Min. {progress?.targetHours ?? 20} hrs of ad playback
          </li>
          <li className="flex items-start gap-1">
            <span className="text-green-600">✓</span> Maintain device uptime (telemetry-backed)
          </li>
          <li className="flex items-start gap-1">
            <span className="text-green-600">✓</span> Based on validated playback only
          </li>
        </ul>
        {progress ? (
          <>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 text-right text-[10px] font-semibold text-[#0b2a6b]">{progress.label}</div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export function PaymentHistoryScreen() {
  const { data, err, loading, token } = useActivity()
  if (!token) return <EmptyAuth message="Sign in to view payments." />
  if (loading) return <Loader />
  if (err) return <ErrorText text={err} />

  const payouts = data?.payouts || []

  return (
    <div className="flex h-full flex-col px-3 pt-7">
      {!payouts.length ? (
        <p className="mt-8 text-center text-[11px] text-slate-500">No payout records yet.</p>
      ) : (
        <div className="space-y-2">
          {payouts.slice(0, 6).map((p) => {
            const when = p.paidOn || p.createdAt
            const label = new Date(when).toLocaleString('en-IN', {
              month: 'short',
              year: 'numeric',
              timeZone: data?.timeZone || 'Asia/Kolkata',
            })
            const day = new Date(when).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: data?.timeZone || 'Asia/Kolkata',
            })
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eff6ff] text-[#1d4ed8]">
                  👛
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-[#0b2a6b]">{label}</div>
                  <div className="text-[9px] text-slate-500">
                    {day} · {p.status}
                  </div>
                </div>
                <div className="text-[11px] font-extrabold text-[#0b2a6b]">
                  ₹{p.amountInr.toLocaleString('en-IN')}
                </div>
                <span className="text-slate-400">›</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function SupportScreen() {
  const { token } = useAuth()
  const [subject, setSubject] = useState('Support request')
  const [description, setDescription] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [openForm, setOpenForm] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    try {
      await driverApi.support(subject, description)
      setMsg('Ticket saved')
      setDescription('')
      setOpenForm(false)
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed')
    }
  }

  if (!token) return <EmptyAuth message="Sign in to raise a support ticket." />

  return (
    <div id="support" className="flex h-full flex-col items-center px-3 pt-6 text-center">
      <SupportAgent className="h-24 w-28" />
      <h3 className="mt-2 text-[13px] font-extrabold text-[#0b2a6b]">Need Help?</h3>
      <p className="mt-1 text-[10px] text-slate-500">We&apos;re here to assist you.</p>
      {!openForm ? (
        <button
          type="button"
          onClick={() => setOpenForm(true)}
          className="mt-4 w-full rounded-full bg-[#1d4ed8] py-2.5 text-[12px] font-bold text-white"
        >
          Raise a Ticket
        </button>
      ) : (
        <form onSubmit={submit} className="mt-3 w-full text-left">
          <input
            className="mb-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px]"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
          />
          <textarea
            className="mb-2 min-h-20 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your issue (min 10 characters)"
          />
          <button type="submit" className="w-full rounded-full bg-[#1d4ed8] py-2 text-[11px] font-bold text-white">
            Submit ticket
          </button>
        </form>
      )}
      {msg ? <p className="mt-2 text-[10px] text-green-600">{msg}</p> : null}
      {err ? <p className="mt-2 text-[10px] text-red-600">{err}</p> : null}
      <div className="mt-auto mb-4 flex w-full justify-around text-[10px] font-semibold text-[#1d4ed8]">
        <span>❓ FAQs</span>
        <span>🎧 Contact Us</span>
      </div>
    </div>
  )
}

function Loader() {
  return <div className="flex h-full items-center justify-center text-[11px] text-slate-400">Loading…</div>
}

function ErrorText({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-red-600">{text}</div>
}
