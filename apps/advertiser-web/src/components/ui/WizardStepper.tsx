type Step = {
  id: number
  label: string
  hint?: string
  shortLabel?: string
}

type WizardStepperProps = {
  steps: Step[]
  current: number
}

export function WizardStepper({ steps, current }: WizardStepperProps) {
  const active = steps.find((step) => step.id === current) ?? steps[0]
  const progress = Math.round((current / steps.length) * 100)
  const remaining = Math.max(steps.length - current, 0)

  return (
    <nav
      aria-label="Campaign steps"
      className="overflow-hidden rounded-2xl border border-navy/[0.08] bg-card shadow-[var(--shadow-card)]"
    >
      <div className="relative border-b border-navy/[0.06] bg-[linear-gradient(135deg,#0a1a32_0%,#122a4a_58%,#0d2847_100%)] px-5 py-5 text-white sm:px-6">
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-auto/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-auto">
              Launch journey · {current} of {steps.length}
            </p>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl">{active?.label}</h2>
            {active?.hint ? (
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/70">{active.hint}</p>
            ) : null}
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2 text-right ring-1 ring-white/15 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">Progress</p>
            <p className="text-lg font-bold tabular-nums text-auto">{progress}%</p>
            <p className="text-[11px] text-white/60">{remaining === 0 ? 'Final step' : `${remaining} left`}</p>
          </div>
        </div>
        <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
          <div
            className="h-full rounded-full bg-gradient-to-r from-auto to-auto-dark transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ol className="grid grid-cols-3 gap-0 overflow-x-auto">
        {steps.map((step, index) => {
          const done = step.id < current
          const isActive = step.id === current
          const short = step.shortLabel ?? step.label.split(' ')[0]

          return (
            <li
              key={step.id}
              className={`relative min-w-[3.75rem] px-1 py-3 text-center transition sm:px-1.5 ${
                isActive ? 'bg-auto/10' : done ? 'bg-teal-muted/35' : 'bg-transparent'
              }`}
            >
              {index < steps.length - 1 ? (
                <span
                  className={`absolute right-0 top-[1.55rem] hidden h-px w-full translate-x-1/2 sm:block ${
                    done || isActive ? 'bg-teal/50' : 'bg-navy/10'
                  }`}
                  aria-hidden
                />
              ) : null}
              <span
                className={`relative z-[1] mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition duration-300 ${
                  isActive
                    ? 'scale-110 bg-auto text-navy shadow-[0_0_0_4px_rgba(240,180,41,0.22)]'
                    : done
                      ? 'bg-teal text-white'
                      : 'bg-navy/[0.06] text-muted'
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="m5 12 5 5L19 7" />
                  </svg>
                ) : (
                  step.id
                )}
              </span>
              <p
                className={`mt-2 px-0.5 text-[9px] font-semibold uppercase tracking-wide sm:text-[10px] ${
                  isActive ? 'text-navy' : done ? 'text-teal' : 'text-muted'
                }`}
                title={step.label}
              >
                <span className="hidden lg:inline">{isActive ? step.label : short}</span>
                <span className="lg:hidden">{short}</span>
              </p>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
