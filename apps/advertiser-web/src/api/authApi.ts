import { apiRequest } from './httpClient'
import { saveAuthSession } from '../lib/authSession'
import { isApiConfigured } from '../lib/config'

export type DevLoginResponse = {
  accessToken: string
  user: {
    id: string
    email: string
    fullName: string
    companyId: string
    companyName: string
    verificationStatus: string
    role: string
  }
}

export async function devLogin(email: string): Promise<DevLoginResponse> {
  if (!isApiConfigured()) {
    throw new Error('Set VITE_API_BASE_URL to use NestJS auth')
  }
  const result = await apiRequest<DevLoginResponse>('/api/v1/auth/dev-login', {
    method: 'POST',
    body: { email },
  })
  saveAuthSession({
    accessToken: result.accessToken,
    userId: result.user.id,
    email: result.user.email,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })
  return result
}
