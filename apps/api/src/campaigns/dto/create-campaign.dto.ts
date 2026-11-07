import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator'

export class CreateCampaignDto {
  @IsString()
  @MinLength(2)
  name!: string

  @IsString()
  @MinLength(2)
  description!: string

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  locations!: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedScreenIds?: string[]

  @IsInt()
  @Min(1)
  requestedAutos!: number

  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  operatingStart!: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  operatingEnd!: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  daysOfWeek?: string[]

  @IsInt()
  @Min(1)
  @Max(100)
  frequencyCap!: number

  @IsInt()
  @Min(0)
  campaignBudgetInr!: number

  @IsOptional()
  @IsString()
  creativeId?: string

  @IsOptional()
  @IsIn(['Draft', 'Submitted'])
  submitMode?: 'Draft' | 'Submitted'
}
