import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { PlatformRole } from '@prisma/client'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthUserContext } from './auth.types'

type JwtPayload = {
  sub: string
  email?: string
  role?: string
  companyId?: string
  fullName?: string
  driverId?: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret =
      config.get<string>('SUPABASE_JWT_SECRET') ||
      config.get<string>('AUTH_DEV_SECRET') ||
      'autoads-dev-secret'
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    })
  }

  async validate(payload: JwtPayload): Promise<AuthUserContext> {
    if (!payload?.sub) throw new UnauthorizedException('Invalid token')

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ authUserId: payload.sub }, { id: payload.sub }, { email: payload.email ?? '' }],
      },
      include: {
        memberships: {
          include: { company: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
        roles: true,
        driver: true,
      },
    })

    if (!user) {
      throw new UnauthorizedException('User not found for this token')
    }

    const membership = user.memberships[0] ?? null
    const driver = user.driver
    const platformRoles = user.roles.map((r) => r.role)

    const isSuperAdmin = platformRoles.includes(PlatformRole.SuperAdmin)
    if (!membership && !driver && !isSuperAdmin) {
      throw new UnauthorizedException('No advertiser membership, driver profile, or admin role for this user')
    }

    return {
      userId: user.id,
      authUserId: user.authUserId,
      email: user.email,
      fullName: user.fullName,
      companyId: membership?.companyId ?? '',
      companyName: membership
        ? membership.company.tradeName || membership.company.legalName || 'Company'
        : isSuperAdmin
          ? 'AutoAds Ops'
          : '',
      role: membership?.role ?? null,
      verificationStatus: membership?.company.verificationStatus ?? null,
      driverId: driver?.id ?? null,
      platformRoles,
    }
  }
}
