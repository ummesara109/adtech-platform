import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { PageLayout } from '../components/ui/PageLayout'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Callout } from '../components/ui/Callout'
import { dropzoneClass, inputClass, labelClass } from '../components/wizard/fieldStyles'
import { useAdvertiser } from '../context/AdvertiserContext'
import { useWorkspace } from '../context/AdvertiserWorkspaceContext'
import type { AdvertiserCreative } from '../api/advertiserWorkspace'
import { creativeSpecs } from '../data/campaignWizard'
import { archiveCreative, renameCreative } from '../lib/advertiserRecords'
import { persistCreativeToLibrary } from '../lib/creativeLibrary'
import { validateCreativeFile } from '../lib/creativeFileValidation'
import { formatFileSize, optimizeCreativeImage } from '../lib/imageOptimization'
import { campaignStatusClass } from '../lib/statusStyles'
import type { CampaignStatus } from '../types/advertiser'
import type { CreativeFormat } from '../types/campaignWizard'

type TypeFilter = 'all' | 'Image' | 'Video'

function moderationBadgeClass(status: AdvertiserCreative['status']) {
  if (status === 'Approved') return campaignStatusClass('Approved')
  if (status === 'Revision Required') return campaignStatusClass('Revision Required')
  if (status === 'Pending moderation') return campaignStatusClass('Submitted')
  return campaignStatusClass('Draft' as CampaignStatus)
}

type PendingUpload = {
  file: File
  previewUrl: string
  type: 'Image' | 'Video'
  sizeBytes: number
  width: number | null
  height: number | null
}

export function CreativesPage() {
  const navigate = useNavigate()
  const { account, profile } = useAdvertiser()
  const { data, loading, error: workspaceError, reload } = useWorkspace()
  const advertiserKey = profile.contactEmail || account.companyName || account.fullName
  const fileRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [format, setFormat] = useState<'Image' | 'Video'>('Image')
  const [creativeName, setCreativeName] = useState('')
  const [pending, setPending] = useState<PendingUpload | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [toast, setToast] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const items = data.creatives
  const preview = useMemo(() => items.find((item) => item.id === previewId) ?? null, [items, previewId])
  const deleteTarget = useMemo(() => items.find((item) => item.id === deleteId) ?? null, [items, deleteId])
  const renameTarget = useMemo(() => items.find((item) => item.id === renameId) ?? null, [items, renameId])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false
      if (!query.trim()) return true
      const hay = `${item.name} ${item.id} ${item.type}`.toLowerCase()
      return hay.includes(query.trim().toLowerCase())
    })
  }, [items, query, typeFilter])

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuId(null)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [])

  useEffect(() => {
    return () => {
      if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl)
    }
  }, [pending])

  function clearPending() {
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl)
    setPending(null)
    setCreativeName('')
    setUploadError('')
    setProgress(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function closeUpload() {
    clearPending()
    setUploadOpen(false)
  }

  async function onPickFile(file: File | null) {
    setUploadError('')
    if (!file) return
    setBusy(true)
    setProgress(8)
    try {
      const wizardFormat: CreativeFormat = format === 'Video' ? 'Video' : 'Static image'
      let workingFile = file
      let width: number | null = null
      let height: number | null = null

      if (format === 'Image') {
        const optimized = await optimizeCreativeImage(file, (event) => setProgress(event.percent))
        if (!optimized.ok) {
          setUploadError(optimized.errors[0] ?? 'Image optimization failed.')
          setProgress(null)
          return
        }
        workingFile = optimized.file
        width = optimized.finalWidth
        height = optimized.finalHeight
      }

      const validation = await validateCreativeFile(workingFile, wizardFormat)
      if (!validation.ok) {
        setUploadError(validation.errors[0] ?? 'Creative validation failed.')
        setProgress(null)
        return
      }
      width = validation.width ?? width
      height = validation.height ?? height

      if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl)
      const previewUrl = URL.createObjectURL(workingFile)
      setPending({
        file: workingFile,
        previewUrl,
        type: format,
        sizeBytes: workingFile.size,
        width,
        height,
      })
      setCreativeName(workingFile.name.replace(/\.[^.]+$/, '') || workingFile.name)
      setProgress(null)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not read this file.')
      setProgress(null)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function confirmAddToLibrary() {
    if (!pending) return
    if (!creativeName.trim()) {
      setUploadError('Enter a creative name.')
      return
    }
    setBusy(true)
    setUploadError('')
    setProgress(40)
    try {
      const displayName = creativeName.trim()
      const renamed =
        displayName === pending.file.name
          ? pending.file
          : new File([pending.file], `${displayName}${pending.file.name.includes('.') ? pending.file.name.slice(pending.file.name.lastIndexOf('.')) : ''}`, {
              type: pending.file.type,
            })

      const saved = await persistCreativeToLibrary({
        advertiserKey,
        fileName: renamed.name,
        type: pending.type,
        sizeBytes: pending.sizeBytes,
        previewUrl: pending.previewUrl,
        mimeType: pending.file.type,
        width: pending.width,
        height: pending.height,
      })
      if (saved.name !== displayName) {
        renameCreative(advertiserKey, saved.id, displayName)
      }

      setProgress(100)
      setToast(`“${displayName}” added to your Creative Library (saved in this browser — not cloud storage).`)
      setPreviewId(saved.id)
      closeUpload()
      reload()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not save creative.')
      setProgress(null)
    } finally {
      setBusy(false)
      window.setTimeout(() => setProgress(null), 600)
    }
  }

  function useInCampaign(creativeId: string) {
    navigate(`/campaigns/create?creativeId=${encodeURIComponent(creativeId)}`)
  }

  function openRename(creative: AdvertiserCreative) {
    setMenuId(null)
    setRenameId(creative.id)
    setRenameValue(creative.name)
  }

  function applyRename() {
    if (!renameId || !renameValue.trim()) return
    const ok = renameCreative(advertiserKey, renameId, renameValue)
    if (ok) {
      setToast('Creative renamed.')
      reload()
    } else {
      setToast('Could not rename this creative.')
    }
    setRenameId(null)
  }

  const tabs: { id: TypeFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'Image', label: 'Images' },
    { id: 'Video', label: 'Videos' },
  ]

  return (
    <PageLayout className="max-w-[88rem] space-y-6">
      <PageHeader
        title="Creative Library"
        description="Manage and reuse your advertisement creatives."
        actions={
          <Button type="button" onClick={() => setUploadOpen(true)}>
            + Upload Creative
          </Button>
        }
      />

      <Callout variant="info">
        Creatives are stored in this browser for frontend preview. Cloud storage and moderation sync are not connected
        yet — nothing here is claimed as a permanent server upload.
      </Callout>

      {workspaceError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {workspaceError}
        </p>
      ) : null}

      {toast ? (
        <p className="rounded-xl border border-teal/25 bg-teal-muted/30 px-4 py-3 text-sm text-navy" role="status">
          {toast}
        </p>
      ) : null}

      <Card padding="md" className="!p-0 overflow-hidden">
        <div className="border-b border-navy/[0.06] bg-paper/40 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1 rounded-xl bg-white p-1 ring-1 ring-navy/10">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    typeFilter === tab.id ? 'bg-navy text-white' : 'text-navy hover:bg-paper'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <label className="relative min-w-0 flex-1 lg:max-w-sm text-xs font-semibold text-muted">
              Search by creative name
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search creatives…"
                className={`${inputClass} mt-1`}
              />
            </label>
          </div>
          <p className="mt-3 text-sm text-muted">
            {formatCount(filteredItems.length)} of {formatCount(items.length)} creatives
          </p>
        </div>

        <div className="px-4 py-5 sm:px-6">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-56 rounded-2xl" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              title={items.length === 0 ? 'No creatives yet' : 'No matching creatives'}
              description={
                items.length === 0
                  ? 'Upload an image or video to build your library, then reuse it when creating campaigns.'
                  : 'Try another search or filter tab.'
              }
              action={
                items.length === 0 ? (
                  <Button size="sm" onClick={() => setUploadOpen(true)}>
                    Upload Creative
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((creative) => (
                <li key={creative.id} className="relative">
                  <article className="overflow-hidden rounded-2xl border border-navy/[0.08] bg-card shadow-[var(--shadow-card)] transition hover:border-navy/15 hover:shadow-md">
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={() => setPreviewId(creative.id)}
                    >
                      <div className="aspect-video bg-navy/[0.04]">
                        {creative.previewUrl ? (
                          creative.type === 'Video' ? (
                            <video
                              src={creative.previewUrl}
                              className="h-full w-full object-contain bg-black"
                              muted
                              playsInline
                            />
                          ) : (
                            <img
                              src={creative.previewUrl}
                              alt=""
                              className="h-full w-full object-contain bg-black"
                            />
                          )
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
                            <p className="text-xs font-semibold text-muted">{creative.type}</p>
                            <p className="text-[11px] text-muted">No local preview file</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5 px-3 py-3">
                        <p className="truncate text-sm font-bold text-navy">{creative.name}</p>
                        <p className="text-xs text-muted">
                          {creative.type} · {creative.size}
                          {creative.uploadedAt ? ` · ${creative.uploadedAt}` : ''}
                        </p>
                        <span className={moderationBadgeClass(creative.status)}>{creative.status}</span>
                      </div>
                    </button>

                    <div className="absolute right-2 top-2" ref={menuId === creative.id ? menuRef : undefined}>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-navy shadow-sm ring-1 ring-navy/10 hover:bg-white"
                        aria-label={`Actions for ${creative.name}`}
                        aria-expanded={menuId === creative.id}
                        onClick={(event) => {
                          event.stopPropagation()
                          setMenuId((id) => (id === creative.id ? null : creative.id))
                        }}
                      >
                        ⋯
                      </button>
                      {menuId === creative.id ? (
                        <div
                          role="menu"
                          className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-navy/10 bg-white py-1 shadow-[var(--shadow-elevated)]"
                        >
                          <MenuItem
                            label="Preview"
                            onClick={() => {
                              setMenuId(null)
                              setPreviewId(creative.id)
                            }}
                          />
                          <MenuItem label="Rename" onClick={() => openRename(creative)} />
                          <MenuItem
                            label="Use in Campaign"
                            onClick={() => {
                              setMenuId(null)
                              useInCampaign(creative.id)
                            }}
                          />
                          <MenuItem
                            label="Delete"
                            danger
                            onClick={() => {
                              setMenuId(null)
                              setDeleteId(creative.id)
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Upload modal */}
      {uploadOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="upload-creative-title">
          <Card padding="md" className="max-h-[90svh] w-full max-w-lg overflow-y-auto !p-5 shadow-[var(--shadow-elevated)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="upload-creative-title" className="text-lg font-bold text-navy">
                  Upload Creative
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Preview and name your file before adding it to the library (browser storage only).
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={closeUpload}>
                Close
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(['Image', 'Video'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setFormat(option)
                    clearPending()
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    format === option ? 'bg-navy text-white' : 'border border-navy/12 bg-white text-navy'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              {format === 'Image'
                ? `${creativeSpecs.image.types} · max ${creativeSpecs.image.maxSizeMb} MB after optimize`
                : `${creativeSpecs.video.types} · ${creativeSpecs.video.minDurationSeconds}–${creativeSpecs.video.maxDurationSeconds}s · max ${creativeSpecs.video.maxSizeMb} MB`}
            </p>

            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              accept={format === 'Video' ? 'video/mp4' : 'image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png'}
              disabled={busy}
              onChange={(event) => void onPickFile(event.target.files?.[0] ?? null)}
            />

            {!pending ? (
              <button
                type="button"
                className={`${dropzoneClass} mt-4 ${busy ? 'pointer-events-none opacity-60' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  void onPickFile(event.dataTransfer.files?.[0] ?? null)
                }}
              >
                <span className="text-2xl">↑</span>
                <p className="mt-2 text-sm font-semibold text-navy">
                  {busy ? 'Processing…' : `Drag & drop or browse ${format.toLowerCase()}`}
                </p>
              </button>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="overflow-hidden rounded-xl border border-navy/[0.08] bg-black">
                  {pending.type === 'Video' ? (
                    <video src={pending.previewUrl} controls className="aspect-video w-full object-contain" />
                  ) : (
                    <img src={pending.previewUrl} alt="" className="aspect-video w-full object-contain" />
                  )}
                </div>
                <p className="text-xs text-muted">
                  {pending.file.name} · {pending.type} · {formatFileSize(pending.sizeBytes)}
                </p>
                <div>
                  <label className={labelClass} htmlFor="creative-display-name">
                    Creative name
                  </label>
                  <input
                    id="creative-display-name"
                    className={inputClass}
                    value={creativeName}
                    onChange={(event) => setCreativeName(event.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={clearPending} disabled={busy}>
                    Remove file
                  </Button>
                  <Button size="sm" onClick={() => void confirmAddToLibrary()} disabled={busy}>
                    Add to Library
                  </Button>
                </div>
              </div>
            )}

            {progress != null ? (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs font-semibold text-navy">
                  <span>Processing</span>
                  <span className="tabular-nums">{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-navy/[0.08]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-auto to-auto-dark transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : null}
            {uploadError ? (
              <p className="mt-3 text-sm font-medium text-rose-700" role="alert">
                {uploadError}
              </p>
            ) : null}
          </Card>
        </div>
      ) : null}

      {/* Preview modal */}
      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy/45 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-creative-title"
          onClick={() => setPreviewId(null)}
        >
          <div
            className="max-h-[92svh] w-full max-w-3xl overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
          <Card padding="md" className="!p-5 shadow-[var(--shadow-elevated)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="preview-creative-title" className="truncate text-lg font-bold text-navy">
                  {preview.name}
                </h2>
                <p className="mt-1 font-mono text-xs text-muted">{preview.id}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPreviewId(null)}>
                Close
              </Button>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-navy/[0.08] bg-black">
              {preview.previewUrl ? (
                preview.type === 'Video' ? (
                  <video src={preview.previewUrl} controls className="max-h-[50vh] w-full object-contain" />
                ) : (
                  <img
                    src={preview.previewUrl}
                    alt={preview.name}
                    className="max-h-[50vh] w-full object-contain"
                  />
                )
              ) : (
                <div className="px-4 py-16 text-center text-sm text-white/70">
                  No local preview file for this asset.
                </div>
              )}
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Type</dt>
                <dd className="font-semibold text-navy">{preview.type}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Size</dt>
                <dd className="font-semibold text-navy">{preview.size}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Uploaded</dt>
                <dd className="font-semibold text-navy">{preview.uploadedAt || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Status</dt>
                <dd>
                  <span className={moderationBadgeClass(preview.status)}>{preview.status}</span>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted">Notes</dt>
                <dd className="text-navy">{preview.previewNote}</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-navy/[0.06] pt-4">
              <Button onClick={() => useInCampaign(preview.id)}>Use in Campaign</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setPreviewId(null)
                  openRename(preview)
                }}
              >
                Rename
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setPreviewId(null)
                  setDeleteId(preview.id)
                }}
              >
                Delete
              </Button>
              <ButtonLink to="/campaigns/create" variant="ghost" size="md">
                Open Create Campaign
              </ButtonLink>
            </div>
          </Card>
          </div>
        </div>
      ) : null}

      {/* Rename modal */}
      {renameTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" role="dialog" aria-modal="true">
          <Card padding="md" className="w-full max-w-md !p-5">
            <CardHeader title="Rename creative" description={renameTarget.id} />
            <label className={labelClass} htmlFor="rename-creative">
              Name
            </label>
            <input
              id="rename-creative"
              className={inputClass}
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              autoFocus
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={applyRename} disabled={!renameValue.trim()}>
                Save name
              </Button>
              <Button variant="ghost" onClick={() => setRenameId(null)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete creative?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed from your Creative Library picker. Campaigns that already reference it keep their association. This does not delete a cloud file (local preview only).`
            : ''
        }
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return
          archiveCreative(advertiserKey, deleteId)
          if (previewId === deleteId) setPreviewId(null)
          setDeleteId(null)
          setToast('Creative removed from library.')
          reload()
        }}
      />
    </PageLayout>
  )
}

function formatCount(n: number) {
  return new Intl.NumberFormat('en-IN').format(n)
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`block w-full px-3 py-2 text-left text-sm font-medium transition hover:bg-paper ${
        danger ? 'text-rose-700' : 'text-navy'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
