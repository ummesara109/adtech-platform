import { useMemo, useRef, useState } from 'react'
import type { AdvertiserCreative } from '../../api/advertiserWorkspace'
import { creativeSpecs } from '../../data/campaignWizard'
import { persistCreativeToLibrary } from '../../lib/creativeLibrary'
import { validateCreativeFile } from '../../lib/creativeFileValidation'
import { formatFileSize, optimizeCreativeImage } from '../../lib/imageOptimization'
import { formatNumber } from '../../lib/format'
import { useAdvertiser } from '../../context/AdvertiserContext'
import type {
  CampaignDraft,
  CreativeFormat,
  CreativeImageOptimization,
} from '../../types/campaignWizard'
import { Button } from '../ui/Button'

type LibraryCreative = AdvertiserCreative & { previewUrl?: string; uploadedAt?: string }

type Props = {
  draft: CampaignDraft
  library: LibraryCreative[]
  onPatch: (partial: Partial<CampaignDraft>) => void
  onValidationError: (messages: string[]) => void
  onLibraryChanged?: () => void
  /** Omit top “step” title when embedded in a parent stage card. */
  embedded?: boolean
}

function SpecList({ format }: { format: CreativeFormat | '' }) {
  if (!format) {
    return <p className="text-sm text-muted">Select Image or Video to see device creative requirements.</p>
  }
  const isVideo = format === 'Video'
  const spec = isVideo ? creativeSpecs.video : creativeSpecs.image
  return (
    <ul className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
      <li className="rounded-xl bg-paper px-3 py-2">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Formats</span>
        <span className="font-semibold text-navy">{spec.types}</span>
      </li>
      <li className="rounded-xl bg-paper px-3 py-2">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Max size</span>
        <span className="font-semibold text-navy">{spec.maxSizeMb} MB</span>
      </li>
      <li className="rounded-xl bg-paper px-3 py-2">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Resolution</span>
        <span className="font-semibold text-navy">{spec.resolution}</span>
      </li>
      <li className="rounded-xl bg-paper px-3 py-2">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">
          {isVideo ? 'Duration' : 'Aspect'}
        </span>
        <span className="font-semibold text-navy">
          {isVideo
            ? `${creativeSpecs.video.minDurationSeconds}–${creativeSpecs.video.maxDurationSeconds}s`
            : spec.aspectRatio}
        </span>
      </li>
    </ul>
  )
}

function RickshawPreview({ draft }: { draft: CampaignDraft }) {
  const creative = draft.creative
  return (
    <div className="flex h-full flex-col rounded-2xl border border-navy/[0.08] bg-gradient-to-b from-navy to-[#122a4a] p-5 text-white shadow-[var(--shadow-elevated)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-auto">Live screen preview</p>
          <h3 className="mt-1 text-lg font-bold">Auto-rickshaw display</h3>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80 ring-1 ring-white/15">
          16:9
        </span>
      </div>

      <div className="relative mx-auto mt-6 w-full max-w-md">
        <div className="rounded-[1.25rem] border-[3px] border-white/25 bg-black/50 p-2 shadow-inner">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-[#0b1220]">
            {!creative ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-auto">▣</div>
                <p className="text-sm font-semibold text-white/90">No creative selected</p>
                <p className="text-xs text-white/55">Choose from your library or upload a new asset.</p>
              </div>
            ) : creative.previewUrl ? (
              creative.format === 'Video' ? (
                <video
                  key={creative.previewUrl}
                  src={creative.previewUrl}
                  controls
                  className="h-full w-full object-contain"
                />
              ) : (
                <img
                  key={creative.previewUrl}
                  src={creative.previewUrl}
                  alt={creative.fileName}
                  className="h-full w-full object-contain bg-black"
                />
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
                <p className="text-sm font-semibold text-white">{creative.fileName}</p>
                <p className="text-xs text-white/55">Library asset · preview file not stored locally</p>
              </div>
            )}
          </div>
        </div>
        <div className="mx-auto mt-2 h-2 w-2/3 rounded-full bg-white/15" aria-hidden />
        <p className="mt-3 text-center text-[11px] text-white/50">Illustrative cabin screen frame · AutoAds DOOH</p>
      </div>

      {creative ? (
        <div className="mt-auto rounded-xl bg-white/10 px-3 py-2.5 text-xs ring-1 ring-white/10">
          <p className="font-semibold text-white">{creative.fileName}</p>
          <p className="mt-0.5 text-white/60">
            {creative.format === 'Static image' ? 'Image' : 'Video'} · {creative.moderationStatus}
            {creative.id ? ` · ID ${creative.id}` : ''}
            {creative.width && creative.height ? ` · ${creative.width}×${creative.height}` : ''}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function OptimizationStats({ stats }: { stats: CreativeImageOptimization }) {
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl border border-teal/25 bg-teal-muted/25 px-4 py-3">
        <p className="text-sm font-bold text-navy">
          {stats.optimized
            ? 'Your image has been automatically optimized and is ready to upload.'
            : stats.message}
        </p>
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-xl bg-white/70 px-3 py-2">
            <dt className="font-semibold uppercase tracking-wide text-muted">Original size</dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-navy">
              {formatFileSize(stats.originalSizeBytes)}
            </dd>
          </div>
          <div className="rounded-xl bg-white/70 px-3 py-2">
            <dt className="font-semibold uppercase tracking-wide text-muted">Optimized size</dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-navy">
              {formatFileSize(stats.optimizedSizeBytes)}
              {stats.optimized && stats.reductionPercent > 0 ? (
                <span className="ml-1.5 text-[11px] font-semibold text-teal">−{stats.reductionPercent}%</span>
              ) : null}
            </dd>
          </div>
          <div className="rounded-xl bg-white/70 px-3 py-2">
            <dt className="font-semibold uppercase tracking-wide text-muted">Original resolution</dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-navy">
              {stats.originalWidth} × {stats.originalHeight}
            </dd>
          </div>
          <div className="rounded-xl bg-white/70 px-3 py-2">
            <dt className="font-semibold uppercase tracking-wide text-muted">Final resolution</dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-navy">
              {stats.finalWidth} × {stats.finalHeight}
            </dd>
          </div>
        </dl>
      </div>
      {stats.qualityWarning ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
          {stats.qualityWarning}
        </p>
      ) : null}
    </div>
  )
}

export function CreativeUploadStep({ draft, library, onPatch, onValidationError, onLibraryChanged, embedded = false }: Props) {
  const { account, profile } = useAdvertiser()
  const advertiserKey = profile.contactEmail || account.companyName || account.fullName
  const fileRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  const [source, setSource] = useState<'library' | 'upload'>(
    draft.creative?.id && !draft.creative.optimization ? 'library' : draft.creative ? 'upload' : 'library',
  )
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [progressLabel, setProgressLabel] = useState('Preparing creative…')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [successNote, setSuccessNote] = useState<string | null>(null)
  /** Optional: new uploads can stay on this campaign only until Submit/Draft. */
  const [saveToLibrary, setSaveToLibrary] = useState(true)

  const format = draft.format
  const compatibleLibrary = useMemo(
    () =>
      library.filter((item) => {
        if (!format) return true
        return format === 'Video' ? item.type === 'Video' : item.type === 'Image'
      }),
    [library, format],
  )

  function revokePreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }

  function setFormat(next: CreativeFormat) {
    if (draft.format === next) return
    revokePreview()
    onPatch({ format: next, creative: null })
    setLocalError(null)
    setSuccessNote(null)
    setProgress(null)
  }

  function selectLibraryCreative(creative: LibraryCreative) {
    const nextFormat: CreativeFormat = creative.type === 'Video' ? 'Video' : 'Static image'
    revokePreview()
    onPatch({
      format: nextFormat,
      creative: {
        id: creative.id,
        fileName: creative.name,
        format: nextFormat,
        sizeBytes: creative.sizeBytes ?? 0,
        durationSeconds: nextFormat === 'Video' ? draft.adDurationSeconds : null,
        previewUrl: creative.previewUrl || '',
        moderationStatus:
          creative.status === 'Approved'
            ? 'Approved'
            : creative.status === 'Revision Required'
              ? 'Revision Required'
              : creative.status === 'Pending moderation'
                ? 'Pending moderation'
                : 'Draft',
        optimization: null,
      },
    })
    setLocalError(null)
    setSuccessNote(`Using library creative “${creative.name}” — file will not be uploaded again.`)
    setSource('library')
    onValidationError([])
  }

  async function processFile(file: File | null) {
    if (!file) return
    if (!format) {
      setLocalError('Select Image or Video advertisement first.')
      onValidationError(['Select Image or Video advertisement first.'])
      return
    }

    setBusy(true)
    setLocalError(null)
    setSuccessNote(null)
    setProgress(4)
    setProgressLabel(format === 'Static image' ? 'Reading image…' : 'Preparing video…')
    onValidationError([])

    let videoTick: number | null = null
    if (format === 'Video') {
      videoTick = window.setInterval(() => {
        setProgress((value) => {
          if (value == null || value >= 88) return value
          return value + 6
        })
      }, 80)
    }

    try {
      let workingFile = file
      let optimization: CreativeImageOptimization | null = null

      if (format === 'Static image') {
        const optimized = await optimizeCreativeImage(file, (event) => {
          setProgress(event.percent)
          setProgressLabel(event.message)
        })
        if (!optimized.ok) {
          setProgress(null)
          setLocalError(optimized.errors[0] ?? 'Image optimization failed.')
          onValidationError(optimized.errors)
          revokePreview()
          onPatch({ creative: null })
          return
        }
        workingFile = optimized.file
        optimization = {
          optimized: optimized.optimized,
          originalSizeBytes: optimized.originalSizeBytes,
          optimizedSizeBytes: optimized.optimizedSizeBytes,
          originalWidth: optimized.originalWidth,
          originalHeight: optimized.originalHeight,
          finalWidth: optimized.finalWidth,
          finalHeight: optimized.finalHeight,
          reductionPercent: optimized.reductionPercent,
          message: optimized.message,
          qualityWarning: optimized.qualityWarning,
        }
      }

      setProgressLabel('Validating creative…')
      setProgress((value) => Math.max(value ?? 0, 90))

      const result = await validateCreativeFile(workingFile, format)
      if (!result.ok) {
        setProgress(null)
        setLocalError(result.errors[0] ?? 'Creative validation failed.')
        onValidationError(result.errors)
        revokePreview()
        onPatch({ creative: null })
        return
      }

      revokePreview()
      const previewUrl = URL.createObjectURL(workingFile)
      previewUrlRef.current = previewUrl

      let creativeId: string | null = null
      if (saveToLibrary) {
        setProgressLabel('Saving to Creative Library…')
        const saved = await persistCreativeToLibrary({
          advertiserKey,
          fileName: workingFile.name,
          type: format === 'Video' ? 'Video' : 'Image',
          sizeBytes: workingFile.size,
          previewUrl,
          mimeType: workingFile.type,
          width: result.width ?? optimization?.finalWidth,
          height: result.height ?? optimization?.finalHeight,
          campaignName: draft.name || undefined,
        })
        creativeId = saved.id
        onLibraryChanged?.()
      } else {
        setProgressLabel('Attaching to campaign…')
      }

      setProgress(100)
      setProgressLabel('Creative ready')
      onPatch({
        creative: {
          id: creativeId,
          fileName: workingFile.name,
          format,
          sizeBytes: workingFile.size,
          durationSeconds:
            format === 'Video' ? result.durationSeconds ?? draft.adDurationSeconds : null,
          previewUrl,
          moderationStatus: 'Draft',
          mimeType: workingFile.type,
          width: result.width ?? optimization?.finalWidth ?? null,
          height: result.height ?? optimization?.finalHeight ?? null,
          optimization,
        },
        ...(format === 'Video' && result.durationSeconds
          ? { adDurationSeconds: Math.min(30, Math.max(10, result.durationSeconds)) }
          : {}),
      })
      setSource('upload')
      setSuccessNote(
        saveToLibrary
          ? optimization?.optimized
            ? 'Optimized and saved to your Creative Library — ready for this campaign.'
            : 'Saved to your Creative Library — ready for this campaign.'
          : 'Creative attached to this campaign only (not saved to Creative Library). Local preview only — not uploaded to cloud storage.',
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not process this file.'
      setLocalError(message)
      onValidationError([message])
      revokePreview()
      onPatch({ creative: null })
      setProgress(null)
      setSuccessNote(null)
    } finally {
      if (videoTick != null) window.clearInterval(videoTick)
      setBusy(false)
      window.setTimeout(() => setProgress((value) => (value === 100 ? null : value)), 900)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {embedded ? null : (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-auto-dark">Creative</p>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-navy">Upload or choose your ad</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Attach a creative from your library or upload a new one. New uploads are saved to the library once —
            reusing never duplicates the file.
          </p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <section className="rounded-2xl border border-navy/[0.08] bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  id: 'upload' as const,
                  title: 'Upload New Creative',
                  hint: 'Add an image or video for this campaign',
                },
                {
                  id: 'library' as const,
                  title: 'Choose from Creative Library',
                  hint: 'Reuse a saved company creative',
                },
              ] as const
            ).map((option) => {
              const selected = source === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSource(option.id)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    selected
                      ? 'border-auto bg-auto/15 shadow-sm ring-2 ring-auto/35'
                      : 'border-navy/10 bg-white hover:border-navy/20'
                  }`}
                >
                  <p className="font-bold text-navy">{option.title}</p>
                  <p className="mt-1 text-xs text-muted">{option.hint}</p>
                </button>
              )
            })}
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-navy">Ad format for this campaign</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {(
                [
                  { id: 'Static image' as const, title: 'Image', hint: 'JPG / PNG' },
                  { id: 'Video' as const, title: 'Video', hint: 'MP4 · 10–30s' },
                ] as const
              ).map((option) => {
                const selected = format === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFormat(option.id)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                      selected ? 'border-navy bg-navy text-white' : 'border-navy/10 bg-white text-navy'
                    }`}
                  >
                    <p className="font-bold">{option.title}</p>
                    <p className={`mt-0.5 text-xs ${selected ? 'text-white/70' : 'text-muted'}`}>{option.hint}</p>
                  </button>
                )
              })}
            </div>
            <SpecList format={format} />
          </div>

          {source === 'library' ? (
            <div className="mt-5">
              <h4 className="text-base font-bold text-navy">My Creative Library</h4>
              <p className="mt-1 text-sm text-muted">
                Selecting an asset links its library ID to this campaign — the file is not uploaded again.
              </p>
              {compatibleLibrary.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-navy/15 bg-paper/60 px-4 py-8 text-center text-sm text-muted">
                  No library creatives yet
                  {format ? ` for ${format === 'Video' ? 'video' : 'image'}` : ''}. Switch to Upload New Creative, or
                  add assets on the Creatives page.
                </p>
              ) : (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {compatibleLibrary.map((creative) => {
                    const selected = draft.creative?.id === creative.id
                    return (
                      <li key={creative.id}>
                        <button
                          type="button"
                          onClick={() => selectLibraryCreative(creative)}
                          className={`w-full overflow-hidden rounded-2xl border text-left transition ${
                            selected
                              ? 'border-auto ring-2 ring-auto/40 shadow-md'
                              : 'border-navy/10 bg-white hover:border-navy/20'
                          }`}
                        >
                          <div className="aspect-video bg-navy/[0.04]">
                            {creative.previewUrl ? (
                              creative.type === 'Video' ? (
                                <video src={creative.previewUrl} className="h-full w-full object-contain bg-black" muted />
                              ) : (
                                <img
                                  src={creative.previewUrl}
                                  alt=""
                                  className="h-full w-full object-contain bg-black"
                                />
                              )
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs font-semibold text-muted">
                                {creative.type}
                              </div>
                            )}
                          </div>
                          <div className="px-3 py-3">
                            <p className="truncate text-sm font-bold text-navy">{creative.name}</p>
                            <p className="mt-0.5 text-xs text-muted">
                              {creative.type} · {creative.size} · {creative.status}
                              {creative.uploadedAt ? ` · ${creative.uploadedAt}` : ''}
                            </p>
                            {selected ? (
                              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-auto-dark">
                                Selected
                              </p>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-muted">
                Showing {formatNumber(compatibleLibrary.length)} library creatives
              </p>
            </div>
          ) : (
          <div className="mt-5">
              <h4 className="text-base font-bold text-navy">Upload new creative</h4>
              <p className="mt-1 text-sm text-muted">
                Drag and drop or browse. Files stay in this browser session until you save or submit — not claimed as
                cloud storage.
              </p>
              <label className="mt-3 flex items-start gap-2.5 rounded-xl border border-navy/10 bg-paper/70 px-3 py-2.5 text-sm text-navy">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-auto"
                  checked={saveToLibrary}
                  onChange={(event) => setSaveToLibrary(event.target.checked)}
                />
                <span>
                  <span className="font-semibold">Save to Creative Library</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Optional. When checked, this asset appears on the Creatives page for reuse in other campaigns.
                  </span>
                </span>
              </label>

              <input
                ref={fileRef}
                type="file"
                className="sr-only"
                accept={format === 'Video' ? 'video/mp4' : 'image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png'}
                disabled={!format || busy}
                onChange={(event) => void processFile(event.target.files?.[0] ?? null)}
              />

              <div
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') fileRef.current?.click()
                }}
                onClick={() => fileRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragOver(false)
                  void processFile(event.dataTransfer.files?.[0] ?? null)
                }}
                className={`mt-4 flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
                  dragOver
                    ? 'border-auto bg-auto/10'
                    : 'border-navy/15 bg-paper/70 hover:border-teal/40 hover:bg-teal-muted/20'
                } ${!format || busy ? 'pointer-events-none opacity-55' : ''}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-xl text-auto shadow-md">
                  ↑
                </div>
                <p className="mt-3 text-base font-bold text-navy">Drag & drop your creative here</p>
                <p className="mt-1 text-sm text-muted">or browse from your device</p>
                <Button type="button" size="sm" className="mt-3 pointer-events-none" variant="secondary">
                  Choose file
                </Button>
              </div>

              {progress != null ? (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-navy">
                    <span>{progressLabel}</span>
                    <span className="tabular-nums">{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-navy/[0.08]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-auto to-auto-dark transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : null}

              {draft.creative?.optimization ? <OptimizationStats stats={draft.creative.optimization} /> : null}
            </div>
          )}

          {localError ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {localError}
            </p>
          ) : null}

          {successNote && !localError ? (
            <p className="mt-3 rounded-xl border border-teal/30 bg-teal-muted/40 px-3 py-2 text-sm text-navy" role="status">
              {successNote}
            </p>
          ) : null}

            {draft.creative ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal/25 bg-teal-muted/30 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-navy">{draft.creative.fileName}</p>
                <p className="text-xs text-muted">
                  {draft.format === 'Video' ? 'Video' : 'Image'}
                  {' · '}
                  {draft.creative.sizeBytes > 0 ? formatFileSize(draft.creative.sizeBytes) : 'Library asset'}
                  {draft.creative.id ? ` · ${draft.creative.id}` : ''}
                  {' · '}
                  {draft.creative.moderationStatus}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy || !format}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    revokePreview()
                    onPatch({ creative: null })
                    setProgress(null)
                    setLocalError(null)
                    setSuccessNote(null)
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <RickshawPreview draft={draft} />
      </div>
    </div>
  )
}
