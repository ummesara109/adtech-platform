import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator'

export class AvailabilityQueryDto {
  @IsString()
  @MinLength(2)
  city!: string

  /** Locality names (e.g. Whitefield). Empty = all localities in the city. */
  @IsArray()
  @IsString({ each: true })
  localities!: string[]

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate!: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string

  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  daysOfWeek?: string[]

  /** Exclude this company's own holds from blocking (refresh selection). */
  @IsOptional()
  @IsString()
  ignoreHoldCompanyId?: string
}

export class CreateHoldsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  screenIds!: string[]

  @IsString()
  @MinLength(2)
  city!: string

  @IsArray()
  @IsString({ each: true })
  localities!: string[]

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate!: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string

  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  daysOfWeek?: string[]
}

export class ValidateSelectionDto extends CreateHoldsDto {}
