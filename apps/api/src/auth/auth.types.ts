import type { MembershipRole, PlatformRole } from '@prisma/client'

export type AuthUserContext = {
  userId: string
  authUserId: string | null
  email: string
  fullName: string
  /** Empty string when user has no advertiser company membership */
  companyId: string
  companyName: string
  role: MembershipRole | null
  verificationStatus: string | null
  driverId: string | null
  platformRoles: PlatformRole[]
}
