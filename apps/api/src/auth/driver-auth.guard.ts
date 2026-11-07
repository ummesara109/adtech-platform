import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { PlatformRole } from '@prisma/client'
import type { AuthUserContext } from './auth.types'

@Injectable()
export class DriverAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthUserContext }>()
    const user = request.user
    if (!user?.driverId) {
      throw new ForbiddenException('Driver profile required')
    }
    if (!user.platformRoles.includes(PlatformRole.Driver)) {
      throw new ForbiddenException('Driver role required')
    }
    return true
  }
}
