import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { PlatformRole } from '@prisma/client'
import type { AuthUserContext } from './auth.types'

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthUserContext }>()
    const roles = request.user?.platformRoles ?? []
    if (!roles.includes(PlatformRole.SuperAdmin)) {
      throw new ForbiddenException('SuperAdmin role required')
    }
    return true
  }
}
