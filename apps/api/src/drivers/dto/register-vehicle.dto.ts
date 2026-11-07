import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator'

export class RegisterVehicleDto {
  @IsString()
  @MinLength(4)
  registrationNumber!: string

  @IsOptional()
  @IsString()
  makeModel?: string

  @IsOptional()
  @IsString()
  vehicleType?: string

  @IsOptional()
  @IsString()
  rcStorageKey?: string

  @IsOptional()
  @IsInt()
  @Min(1990)
  @Max(2100)
  year?: number

  @IsOptional()
  @IsString()
  color?: string
}
