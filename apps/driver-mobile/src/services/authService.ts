import type { AuthUser } from '../types/api'
import { apiRequest, setAccessToken } from './apiClient'
import { getStoredToken } from './tokenStorage'

type AuthResponse = { accessToken: string; user: AuthUser }

export const authService = {
  async login(email: string, password: string) {
    const data = await apiRequest<AuthResponse>('/auth/driver/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      auth: false,
    })
    await setAccessToken(data.accessToken)
    return data.user
  },

  /** Dev-only email login when AUTH_DEV_MODE=true (no password). */
  async devLogin(email: string) {
    const data = await apiRequest<AuthResponse>('/auth/driver/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email }),
      auth: false,
    })
    await setAccessToken(data.accessToken)
    return data.user
  },

  async register(input: {
    email: string
    fullName: string
    phone?: string
    password: string
    licenseNumber?: string
  }) {
    const data = await apiRequest<AuthResponse>('/auth/driver/register', {
      method: 'POST',
      body: JSON.stringify(input),
      auth: false,
    })
    await setAccessToken(data.accessToken)
    return data.user
  },

  async restoreSession(): Promise<AuthUser | null> {
    const token = await getStoredToken()
    if (!token) return null
    try {
      const me = await apiRequest<{
        kind?: string
        id: string
        email: string
        fullName: string
        driverId?: string
        kycStatus?: string
        accountStatus?: string
      }>('/auth/me')
      if (!me.driverId) {
        await setAccessToken(null)
        return null
      }
      return {
        id: me.id,
        email: me.email,
        fullName: me.fullName,
        driverId: me.driverId,
        kycStatus: me.kycStatus || 'Pending',
        accountStatus: me.accountStatus || 'PendingRegistration',
      }
    } catch {
      await setAccessToken(null)
      return null
    }
  },

  async logout() {
    await setAccessToken(null)
  },
}
