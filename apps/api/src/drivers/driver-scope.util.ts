import { ForbiddenException } from '@nestjs/common'
import type { AuthUserContext } from '../auth/auth.types'

export function assertDriverScope(user: AuthUserContext, driverId?: string): string {
  const id = user.driverId
  if (!id) throw new ForbiddenException('Driver profile required')
  if (driverId && driverId !== id) {
    throw new ForbiddenException('Cannot access another driver record')
  }
  return id
}
