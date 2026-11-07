import { IsString, MinLength } from 'class-validator'

export class UploadKycDocumentDto {
  @IsString()
  @MinLength(2)
  documentId!: string

  @IsString()
  @MinLength(1)
  storageKey!: string
}
