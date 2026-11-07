import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { AuthUserContext } from './auth.types'

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUserContext => {
  const request = ctx.switchToHttp().getRequest<{ user: AuthUserContext }>()
  return request.user
})
