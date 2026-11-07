import { creativeSpecs } from '../data/campaignWizard'

/** Genuine upload size ceiling — not a resolution limit. */
export const IMAGE_MAX_BYTES = creativeSpecs.image.maxSizeMb * 1024 * 1024

/** Informational screen target for quality warnings only (never used to reject). */
export const SCREEN_REF_WIDTH = creativeSpecs.image.recommendedWidth
export const SCREEN_REF_HEIGHT = creativeSpecs.image.recommendedHeight

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png'])

export type ImageOptimizationProgress = {
  stage: 'reading' | 'validating' | 'compressing' | 'verifying' | 'done'
  percent: number
  message: string
}

export type ImageOptimizationResult =
  | {
      ok: true
      file: File
      optimized: boolean
      originalSizeBytes: number
      optimizedSizeBytes: number
      originalWidth: number
      originalHeight: number
      finalWidth: number
      finalHeight: number
      reductionPercent: number
      hadTransparency: boolean
      qualityWarning: string | null
      message: string
    }
  | {
      ok: false
      errors: string[]
    }

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('This image file is corrupted or unreadable.'))
    }
    img.src = url
  })
}

function canvasHasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number) {
  try {
    const { data } = ctx.getImageData(0, 0, width, height)
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true
    }
  } catch {
    // Cross-origin / security restrictions — assume opaque
  }
  return false
}

function drawToCanvas(img: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not initialize image canvas for optimization.')
  ctx.clearRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)
  return { canvas, ctx }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality)
  })
}

function scaleDimensions(width: number, height: number, factor: number) {
  return {
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
  }
}

function renameWithMime(fileName: string, mimeType: string) {
  const base = fileName.replace(/\.[^.]+$/, '') || 'creative'
  if (mimeType === 'image/png') return `${base}.png`
  return `${base}.jpg`
}

/** Soft warning only — never blocks upload. */
export function imageQualityWarning(width: number, height: number): string | null {
  if (width < 1 || height < 1) return null
  if (width < SCREEN_REF_WIDTH || height < SCREEN_REF_HEIGHT) {
    return `This image is ${width}×${height}, smaller than the typical auto-rickshaw screen (${SCREEN_REF_WIDTH}×${SCREEN_REF_HEIGHT}). It will display letterboxed without upscaling — on-screen sharpness may be lower. You can continue.`
  }
  return null
}

/**
 * Encode at a given size. Prefer lossless PNG when transparency must be kept.
 * Use high-quality JPEG first; only lower quality or downscale when needed for the size ceiling.
 */
async function encodeAtSize(
  img: HTMLImageElement,
  width: number,
  height: number,
  preferLosslessPng: boolean,
  onProgress?: (progress: ImageOptimizationProgress) => void,
  progressBase = 40,
): Promise<{ blob: Blob; mimeType: string; width: number; height: number } | null> {
  const { canvas, ctx } = drawToCanvas(img, width, height)
  const hasAlpha = preferLosslessPng || canvasHasTransparency(ctx, width, height)

  if (hasAlpha || preferLosslessPng) {
    onProgress?.({
      stage: 'compressing',
      percent: progressBase,
      message: `Encoding PNG ${width}×${height} (lossless)…`,
    })
    const png = await canvasToBlob(canvas, 'image/png')
    if (png && png.size <= IMAGE_MAX_BYTES) {
      return { blob: png, mimeType: 'image/png', width, height }
    }
    // Keep transparency — do not convert to JPEG.
    return null
  }

  // Opaque images: try PNG encode first when source was PNG (often smaller / lossless)
  if (!hasAlpha) {
    const png = await canvasToBlob(canvas, 'image/png')
    if (png && png.size <= IMAGE_MAX_BYTES) {
      onProgress?.({
        stage: 'compressing',
        percent: progressBase + 5,
        message: `Encoded PNG ${width}×${height} (lossless)…`,
      })
      return { blob: png, mimeType: 'image/png', width, height }
    }
  }

  const qualities = [0.95, 0.9, 0.85, 0.8, 0.75, 0.68]
  for (let i = 0; i < qualities.length; i += 1) {
    const quality = qualities[i]!
    onProgress?.({
      stage: 'compressing',
      percent: progressBase + Math.round(((i + 1) / qualities.length) * 25),
      message: `Compressing JPEG ${width}×${height} (quality ${Math.round(quality * 100)}%)…`,
    })
    const jpeg = await canvasToBlob(canvas, 'image/jpeg', quality)
    if (jpeg && jpeg.size <= IMAGE_MAX_BYTES) {
      return { blob: jpeg, mimeType: 'image/jpeg', width, height }
    }
  }

  return null
}

/**
 * Browser-side image optimize:
 * - Accepts any resolution (no min/max dimension rejects)
 * - Never upscales
 * - Does not force 1920×1080
 * - Compresses for the upload size ceiling only; downscales proportionally only if needed
 * - Preserves PNG transparency
 */
export async function optimizeCreativeImage(
  file: File,
  onProgress?: (progress: ImageOptimizationProgress) => void,
): Promise<ImageOptimizationResult> {
  onProgress?.({ stage: 'reading', percent: 5, message: 'Reading image…' })

  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return { ok: false, errors: ['Images must be JPG, JPEG, or PNG.'] }
  }

  let img: HTMLImageElement
  try {
    img = await loadImageFromFile(file)
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : 'This image file is corrupted or unreadable.'],
    }
  }

  const originalWidth = img.naturalWidth
  const originalHeight = img.naturalHeight

  if (originalWidth < 1 || originalHeight < 1) {
    return { ok: false, errors: ['This image file is corrupted or unreadable.'] }
  }

  onProgress?.({ stage: 'validating', percent: 18, message: 'Checking file…' })

  const qualityWarning = imageQualityWarning(originalWidth, originalHeight)

  // Already under the upload size ceiling — keep original pixels and bytes.
  if (file.size <= IMAGE_MAX_BYTES) {
    onProgress?.({ stage: 'done', percent: 100, message: 'Image ready.' })
    return {
      ok: true,
      file,
      optimized: false,
      originalSizeBytes: file.size,
      optimizedSizeBytes: file.size,
      originalWidth,
      originalHeight,
      finalWidth: originalWidth,
      finalHeight: originalHeight,
      reductionPercent: 0,
      hadTransparency: file.type === 'image/png',
      qualityWarning,
      message: 'Your image is ready to upload.',
    }
  }

  onProgress?.({
    stage: 'compressing',
    percent: 30,
    message: 'Optimizing file size while preserving quality…',
  })

  // Detect transparency on a full-size draw once
  const probe = drawToCanvas(img, originalWidth, originalHeight)
  const hadTransparency =
    file.type === 'image/png' && canvasHasTransparency(probe.ctx, originalWidth, originalHeight)
  const preferLosslessPng = hadTransparency

  // Attempt 1: same dimensions, high-quality / lossless encode
  let encoded = await encodeAtSize(
    img,
    originalWidth,
    originalHeight,
    preferLosslessPng,
    onProgress,
    40,
  )

  // Attempt 2+: proportional downscale only when size ceiling still not met (never upscale)
  if (!encoded && !preferLosslessPng) {
    const scaleSteps = [0.85, 0.7, 0.55, 0.4, 0.28]
    for (let i = 0; i < scaleSteps.length; i += 1) {
      const dims = scaleDimensions(originalWidth, originalHeight, scaleSteps[i]!)
      onProgress?.({
        stage: 'compressing',
        percent: 70 + i * 4,
        message: `Reducing dimensions to ${dims.width}×${dims.height} to meet upload size…`,
      })
      encoded = await encodeAtSize(img, dims.width, dims.height, false, onProgress, 70 + i * 4)
      if (encoded) break
    }
  }

  // Transparent PNG over limit: try proportional downscale while staying PNG
  if (!encoded && preferLosslessPng) {
    const scaleSteps = [0.85, 0.7, 0.55, 0.4, 0.28, 0.2]
    for (let i = 0; i < scaleSteps.length; i += 1) {
      const dims = scaleDimensions(originalWidth, originalHeight, scaleSteps[i]!)
      onProgress?.({
        stage: 'compressing',
        percent: 70 + i * 4,
        message: `Scaling transparent PNG to ${dims.width}×${dims.height}…`,
      })
      encoded = await encodeAtSize(img, dims.width, dims.height, true, onProgress, 70 + i * 4)
      if (encoded) break
    }
  }

  if (!encoded) {
    return {
      ok: false,
      errors: [
        preferLosslessPng
          ? `Could not bring this transparent PNG under ${creativeSpecs.image.maxSizeMb} MB while preserving transparency. Try a simpler image or fewer colors.`
          : `Could not compress this image under ${creativeSpecs.image.maxSizeMb} MB. Try a simpler image.`,
      ],
    }
  }

  onProgress?.({ stage: 'verifying', percent: 95, message: 'Verifying optimized image…' })

  if (encoded.blob.size > IMAGE_MAX_BYTES) {
    return {
      ok: false,
      errors: [`Optimized image is still larger than ${creativeSpecs.image.maxSizeMb} MB.`],
    }
  }

  const outName = renameWithMime(file.name, encoded.mimeType)
  const outFile = new File([encoded.blob], outName, {
    type: encoded.mimeType,
    lastModified: Date.now(),
  })

  const reductionPercent =
    file.size > 0 ? Math.max(0, Math.round((1 - outFile.size / file.size) * 100)) : 0

  onProgress?.({ stage: 'done', percent: 100, message: 'Optimization complete.' })

  return {
    ok: true,
    file: outFile,
    optimized: true,
    originalSizeBytes: file.size,
    optimizedSizeBytes: outFile.size,
    originalWidth,
    originalHeight,
    finalWidth: encoded.width,
    finalHeight: encoded.height,
    reductionPercent,
    hadTransparency,
    qualityWarning: imageQualityWarning(encoded.width, encoded.height) ?? qualityWarning,
    message: 'Your image has been automatically optimized and is ready to upload.',
  }
}

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024
    return `${kb >= 10 ? Math.round(kb) : kb.toFixed(1)} KB`
  }
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}
