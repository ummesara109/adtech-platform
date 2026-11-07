import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { MembershipRole } from '@prisma/client'
import { ROLES_KEY } from './roles.decorator'
import type { AuthUserContext } from './auth.types'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<MembershipRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required?.length) return true
    const request = context.switchToHttp().getRequest<{ user?: AuthUserContext }>()
    const role = request.user?.role
    if (!role || !required.includes(role)) {
      throw new ForbiddenException(`Requires one of roles: ${required.join(', ')}`)
    }
    return true
  }
}
