import { creativeSpecs } from '../data/campaignWizard'
import { IMAGE_MAX_BYTES } from './imageOptimization'
import type { CreativeFormat } from '../types/campaignWizard'

export type CreativeValidationResult = {
  ok: boolean
  errors: string[]
  durationSeconds: number | null
  width: number | null
  height: number | null
}

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const width = img.naturalWidth
      const height = img.naturalHeight
      URL.revokeObjectURL(url)
      resolve({ width, height })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image dimensions.'))
    }
    img.src = url
  })
}

function readVideoMeta(file: File): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const duration = video.duration
      const width = video.videoWidth
      const height = video.videoHeight
      URL.revokeObjectURL(url)
      resolve({ duration, width, height })
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read video metadata.'))
    }
    video.src = url
  })
}

/**
 * Validate a creative file after any image optimization has run.
 * Images: format, integrity, and upload size only — no resolution rejects.
 */
export async function validateCreativeFile(
  file: File,
  format: CreativeFormat,
): Promise<CreativeValidationResult> {
  const errors: string[] = []
  let durationSeconds: number | null = null
  let width: number | null = null
  let height: number | null = null

  if (format === 'Static image') {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      errors.push('Images must be JPG, JPEG, or PNG.')
    }
    if (file.size > IMAGE_MAX_BYTES) {
      errors.push(`Image must be ${creativeSpecs.image.maxSizeMb} MB or smaller after optimization.`)
    }
    try {
      const size = await readImageSize(file)
      width = size.width
      height = size.height
      if (width < 1 || height < 1) {
        errors.push('This image file is corrupted or unreadable.')
      }
    } catch {
      errors.push('Could not read this image. The file may be corrupted or unreadable.')
    }
  } else {
    if (file.type !== 'video/mp4') {
      errors.push('Videos must be MP4 (H.264).')
    }
    const maxBytes = creativeSpecs.video.maxSizeMb * 1024 * 1024
    if (file.size > maxBytes) {
      errors.push(`Video must be ${creativeSpecs.video.maxSizeMb} MB or smaller.`)
    }
    try {
      const meta = await readVideoMeta(file)
      durationSeconds = Math.round(meta.duration)
      width = meta.width
      height = meta.height
      if (
        durationSeconds < creativeSpecs.video.minDurationSeconds ||
        durationSeconds > creativeSpecs.video.maxDurationSeconds
      ) {
        errors.push(
          `Video duration must be ${creativeSpecs.video.minDurationSeconds}–${creativeSpecs.video.maxDurationSeconds} seconds (detected ${durationSeconds}s).`,
        )
      }
    } catch {
      errors.push('Could not validate video duration or dimensions.')
    }
  }

  return { ok: errors.length === 0, errors, durationSeconds, width, height }
}
