import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import type { AuthUserContext } from './auth.types'

@Injectable()
export class AdvertiserAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthUserContext }>()
    const user = request.user
    if (!user?.companyId?.length) {
      throw new ForbiddenException('Advertiser company membership required')
    }
    return true
  }
}
