import { Module } from '@nestjs/common'
import { LocalUploadService } from './local-upload.service'

@Module({
  providers: [LocalUploadService],
  exports: [LocalUploadService],
})
export class LocalUploadModule {}
