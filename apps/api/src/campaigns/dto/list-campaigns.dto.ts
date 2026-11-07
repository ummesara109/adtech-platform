import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class ListCampaignsDto {
  @IsOptional()
  @IsString()
  q?: string

  /** UI or Prisma status label, e.g. "Under Review" or UnderReview */
  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  location?: string

  /** Inclusive campaign start date lower bound (YYYY-MM-DD) */
  @IsOptional()
  @IsString()
  from?: string

  /** Inclusive campaign end date upper bound (YYYY-MM-DD) */
  @IsOptional()
  @IsString()
  to?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number
}
