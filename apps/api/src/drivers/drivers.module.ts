import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { LocalUploadModule } from '../platform/local-upload.module'
import { DriversController } from './drivers.controller'
import { DriversService } from './drivers.service'

@Module({
  imports: [AuthModule, LocalUploadModule],
  controllers: [DriversController],
  providers: [DriversService],
})
export class DriversModule {}
