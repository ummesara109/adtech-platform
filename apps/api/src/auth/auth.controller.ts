import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'
import { AuthService } from './auth.service'
import { CurrentUser } from './current-user.decorator'
import { JwtAuthGuard } from './jwt-auth.guard'
import type { AuthUserContext } from './auth.types'

class DevLoginDto {
  @IsEmail()
  email!: string
}

class DriverLoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(6)
  password!: string
}

class AdminLoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(6)
  password!: string
}

class DriverRegisterDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(2)
  fullName!: string

  @IsString()
  @MinLength(6)
  password!: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  authUserId?: string

  @IsOptional()
  @IsString()
  licenseNumber?: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('dev-login')
  devLogin(@Body() body: DevLoginDto) {
    return this.auth.issueDevToken(body.email)
  }

  @Post('driver/dev-login')
  driverDevLogin(@Body() body: DevLoginDto) {
    return this.auth.issueDriverDevToken(body.email)
  }

  @Post('driver/login')
  driverLogin(@Body() body: DriverLoginDto) {
    return this.auth.loginDriver(body.email, body.password)
  }

  @Post('admin/login')
  adminLogin(@Body() body: AdminLoginDto) {
    return this.auth.loginAdmin(body.email, body.password)
  }

  @Post('driver/register')
  driverRegister(@Body() body: DriverRegisterDto) {
    return this.auth.registerDriver(body)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUserContext) {
    return this.auth.me(user.userId)
  }
}
