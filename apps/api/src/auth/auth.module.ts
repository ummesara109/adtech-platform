import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './jwt.strategy'
import { AdvertiserAuthGuard } from './advertiser-auth.guard'
import { DriverAuthGuard } from './driver-auth.guard'
import { RolesGuard } from './roles.guard'
import { SuperAdminGuard } from './super-admin.guard'

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>('SUPABASE_JWT_SECRET') ||
          config.get<string>('AUTH_DEV_SECRET') ||
          'autoads-dev-secret',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RolesGuard,
    DriverAuthGuard,
    AdvertiserAuthGuard,
    SuperAdminGuard,
  ],
  exports: [
    AuthService,
    JwtModule,
    RolesGuard,
    DriverAuthGuard,
    AdvertiserAuthGuard,
    SuperAdminGuard,
  ],
})
export class AuthModule {}
