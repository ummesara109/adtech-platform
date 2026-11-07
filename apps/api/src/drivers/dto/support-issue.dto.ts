import { IsString, MinLength } from 'class-validator'

export class SupportIssueDto {
  @IsString()
  @MinLength(3)
  subject!: string

  @IsString()
  @MinLength(10)
  description!: string
}
