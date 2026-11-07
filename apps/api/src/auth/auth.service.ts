import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { DriverAccountStatus, PlatformRole } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'

const DRIVER_KYC_LABELS = [
  'Aadhaar card',
  'Driving license',
  'Vehicle RC copy',
  'Profile photograph',
]

const BCRYPT_ROUNDS = 10

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Dev login for local advertiser portal testing.
   * Production: Supabase Auth issues JWTs; NestJS only validates them.
   */
  async issueDevToken(email: string) {
    if (this.config.get('AUTH_DEV_MODE') !== 'true') {
      throw new UnauthorizedException('Dev auth is disabled')
    }

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: { include: { company: true }, take: 1 },
      },
    })
    if (!user || !user.memberships[0]) {
      throw new UnauthorizedException(`No seeded advertiser for ${email}. Run prisma:seed first.`)
    }

    const membership = user.memberships[0]
    const accessToken = await this.signToken({
      sub: user.authUserId || user.id,
      email: user.email,
      fullName: user.fullName,
      companyId: membership.companyId,
      role: membership.role,
    })

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        companyId: membership.companyId,
        companyName: membership.company.tradeName || membership.company.legalName,
        verificationStatus: membership.company.verificationStatus,
        role: membership.role,
      },
    }
  }

  async issueDriverDevToken(email: string) {
    if (this.config.get('AUTH_DEV_MODE') !== 'true') {
      throw new UnauthorizedException('Dev auth is disabled')
    }

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { driver: true, roles: true },
    })
    if (!user?.driver) {
      throw new UnauthorizedException(`No seeded driver for ${email}. Run prisma:seed first.`)
    }
    if (!user.roles.some((r) => r.role === PlatformRole.Driver)) {
      throw new UnauthorizedException('User is missing Driver platform role')
    }

    const accessToken = await this.signToken({
      sub: user.authUserId || user.id,
      email: user.email,
      fullName: user.fullName,
      driverId: user.driver.id,
    })

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        driverId: user.driver.id,
        kycStatus: user.driver.kycStatus,
        accountStatus: user.driver.accountStatus,
      },
    }
  }

  async loginDriver(emailRaw: string, password: string) {
    const email = emailRaw.toLowerCase().trim()
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { driver: true, roles: true },
    })
    if (!user?.driver || !user.roles.some((r) => r.role === PlatformRole.Driver)) {
      throw new UnauthorizedException('Invalid email or password')
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Password login is not set for this account. Use registration or ask ops to set a password.',
      )
    }
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) throw new UnauthorizedException('Invalid email or password')

    const accessToken = await this.signToken({
      sub: user.authUserId || user.id,
      email: user.email,
      fullName: user.fullName,
      driverId: user.driver.id,
    })

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        driverId: user.driver.id,
        kycStatus: user.driver.kycStatus,
        accountStatus: user.driver.accountStatus,
      },
    }
  }

  async loginAdmin(emailRaw: string, password: string) {
    const email = emailRaw.toLowerCase().trim()
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    })
    if (!user?.roles.some((r) => r.role === PlatformRole.SuperAdmin)) {
      throw new UnauthorizedException('Invalid email or password')
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('Admin password not configured')
    }
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) throw new UnauthorizedException('Invalid email or password')

    const accessToken = await this.signToken({
      sub: user.authUserId || user.id,
      email: user.email,
      fullName: user.fullName,
      platformRole: PlatformRole.SuperAdmin,
    })

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles.map((r) => r.role),
      },
    }
  }

  async registerDriver(input: {
    email: string
    fullName: string
    phone?: string
    password?: string
    authUserId?: string
    licenseNumber?: string
  }) {
    const email = input.email.toLowerCase()
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ConflictException('An account with this email already exists')
    }
    if (!input.password || input.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters')
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)

    const user = await this.prisma.user.create({
      data: {
        email,
        fullName: input.fullName.trim(),
        phone: input.phone?.trim() || '',
        passwordHash,
        authUserId: input.authUserId || `local-driver-${email}`,
        roles: { create: { role: PlatformRole.Driver } },
        driver: {
          create: {
            licenseNumber: input.licenseNumber?.trim() || '',
            accountStatus: DriverAccountStatus.PendingRegistration,
            kycDocuments: {
              create: DRIVER_KYC_LABELS.map((label) => ({ label, status: 'Required' })),
            },
          },
        },
      },
      include: { driver: true },
    })

    const accessToken = await this.signToken({
      sub: user.authUserId || user.id,
      email: user.email,
      fullName: user.fullName,
      driverId: user.driver!.id,
    })

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        driverId: user.driver!.id,
        kycStatus: user.driver!.kycStatus,
        accountStatus: user.driver!.accountStatus,
      },
    }
  }

  private signToken(payload: Record<string, unknown>) {
    return this.jwt.signAsync(payload)
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: { include: { company: true }, take: 1 },
        driver: true,
        roles: true,
      },
    })
    if (!user) throw new UnauthorizedException()

    const membership = user.memberships[0]
    if (membership) {
      return {
        kind: 'advertiser' as const,
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        companyId: membership.companyId,
        companyName: membership.company.tradeName || membership.company.legalName,
        verificationStatus: membership.company.verificationStatus,
        role: membership.role,
      }
    }

    if (user.driver) {
      return {
        kind: 'driver' as const,
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        driverId: user.driver.id,
        kycStatus: user.driver.kycStatus,
        accountStatus: user.driver.accountStatus,
        platformRoles: user.roles.map((r) => r.role),
      }
    }

    if (user.roles.some((r) => r.role === PlatformRole.SuperAdmin)) {
      return {
        kind: 'admin' as const,
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        platformRoles: user.roles.map((r) => r.role),
      }
    }

    throw new ForbiddenException('No profile found for this user')
  }
}
