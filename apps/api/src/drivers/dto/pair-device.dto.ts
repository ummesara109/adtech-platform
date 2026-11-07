import { IsString, MinLength } from 'class-validator'

export class PairDeviceDto {
  @IsString()
  @MinLength(4)
  pairingCode!: string
}
