import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CreativeModerationStatus, CreativeType } from '@prisma/client'
import type { AuthUserContext } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'
import { toUiStatus } from '../advertiser/workspace.mapper'
import type { CreateCreativeDto } from './dto/create-creative.dto'

const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const VIDEO_MAX_BYTES = 50 * 1024 * 1024
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/jpg'])
const VIDEO_MIME = new Set(['video/mp4'])

function assertCreativeMeta(input: CreateCreativeDto) {
  const mime = input.mimeType?.toLowerCase().trim()
  if (input.type === 'Image') {
    if (mime && !IMAGE_MIME.has(mime)) {
      throw new BadRequestException('Images must be JPG or PNG.')
    }
    if (typeof input.sizeBytes === 'number' && input.sizeBytes > IMAGE_MAX_BYTES) {
      throw new BadRequestException('Image must be 5 MB or smaller after optimization.')
    }
    // Any resolution is accepted — width/height are metadata only (no min/max rejects).
  } else {
    if (mime && !VIDEO_MIME.has(mime)) {
      throw new BadRequestException('Videos must be MP4 (H.264).')
    }
    if (typeof input.sizeBytes === 'number' && input.sizeBytes > VIDEO_MAX_BYTES) {
      throw new BadRequestException('Video must be 50 MB or smaller.')
    }
    if (
      typeof input.durationSeconds === 'number' &&
      (input.durationSeconds < 10 || input.durationSeconds > 30)
    ) {
      throw new BadRequestException('Video duration must be between 10 and 30 seconds.')
    }
  }
}

function buildSpec(input: CreateCreativeDto) {
  if (input.type === 'Image' && input.width && input.height) {
    return `${input.width}×${input.height} · image`
  }
  if (input.type === 'Video' && input.durationSeconds) {
    return `1920×1080 · ${input.durationSeconds}s video`
  }
  return input.type === 'Video' ? '1920×1080 · video' : '1920×1080 · 16:9'
}

@Injectable()
export class CreativesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUserContext) {
    const rows = await this.prisma.creative.findMany({
      where: { companyId: user.companyId, archived: false },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => ({
      id: row.id,
      name: row.fileName,
      type: row.type,
      size: row.sizeLabel,
      spec: row.spec,
      status: toUiStatus(row.moderationStatus),
      version: row.version,
      previewNote: row.previewNote,
      previewUrl: row.previewUrl || undefined,
    }))
  }

  async create(user: AuthUserContext, input: CreateCreativeDto) {
    assertCreativeMeta(input)

    const sizeLabel =
      input.sizeLabel ||
      (typeof input.sizeBytes === 'number'
        ? `${Math.max(1, Math.round(input.sizeBytes / 1024))} KB`
        : '')

    const row = await this.prisma.creative.create({
      data: {
        companyId: user.companyId,
        fileName: input.fileName,
        type: input.type === 'Video' ? CreativeType.Video : CreativeType.Image,
        sizeLabel,
        spec: buildSpec(input),
        moderationStatus: CreativeModerationStatus.Draft,
        previewNote: 'Saved to Creative Library · moderation status updates after platform review',
        previewUrl: input.previewUrl || '',
      },
    })

    await this.prisma.activityEvent.create({
      data: {
        companyId: user.companyId,
        title: 'Creative uploaded',
        body: `${row.fileName} saved to library`,
        kind: 'creative',
      },
    })

    return {
      id: row.id,
      name: row.fileName,
      type: row.type,
      size: row.sizeLabel,
      spec: row.spec,
      status: toUiStatus(row.moderationStatus),
      version: row.version,
      previewNote: row.previewNote,
      previewUrl: row.previewUrl || undefined,
    }
  }

  async archive(user: AuthUserContext, id: string) {
    const existing = await this.prisma.creative.findFirst({
      where: { id, companyId: user.companyId },
    })
    if (!existing) throw new NotFoundException('Creative not found')
    await this.prisma.creative.update({
      where: { id },
      data: { archived: true, moderationStatus: CreativeModerationStatus.Archived },
    })
    return { ok: true }
  }
}
