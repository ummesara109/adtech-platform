import { IsISO8601, IsOptional, IsString, MinLength } from 'class-validator'

export class UpdateDriverProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  licenseNumber?: string

  @IsOptional()
  @IsISO8601()
  licenseExpiry?: string

  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string

  @IsOptional()
  @IsString()
  emergencyContact?: string
}
