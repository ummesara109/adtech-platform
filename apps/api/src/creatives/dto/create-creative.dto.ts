import { Type } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator'

/** Metadata for a creative already optimized in the advertiser browser. */
export class CreateCreativeDto {
  @IsString()
  @MinLength(1)
  fileName!: string

  @IsIn(['Video', 'Image'])
  type!: 'Video' | 'Image'

  @IsOptional()
  @IsString()
  sizeLabel?: string

  @IsOptional()
  @IsString()
  previewUrl?: string

  @IsOptional()
  @IsString()
  mimeType?: string

  /** Final file size in bytes (optimized image / validated video). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  sizeBytes?: number

  @ValidateIf((o: CreateCreativeDto) => o.type === 'Image')
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number

  @ValidateIf((o: CreateCreativeDto) => o.type === 'Image')
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  durationSeconds?: number
}
