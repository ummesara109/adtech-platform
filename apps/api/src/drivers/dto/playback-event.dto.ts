import { PlaybackEventType } from '@prisma/client'
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Min, MinLength } from 'class-validator'

export class PlaybackEventDto {
  @IsString()
  @MinLength(8)
  idempotencyKey!: string

  @IsEnum(PlaybackEventType)
  eventType!: PlaybackEventType

  @IsOptional()
  @IsInt()
  @Min(0)
  validDurationSec?: number

  @IsOptional()
  @IsISO8601()
  startedAt?: string

  @IsOptional()
  @IsISO8601()
  endedAt?: string

  @IsOptional()
  @IsString()
  campaignId?: string
}
