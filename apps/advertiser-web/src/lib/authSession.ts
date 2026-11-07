import { appConfig, isSupabaseAuthConfigured } from './config'

const SESSION_KEY = 'autoads.advertiser.supabaseSession'

export type AuthSession = {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  userId?: string
  email?: string
}

/**
 * Local session bridge until @supabase/supabase-js is installed and wired.
 * NestJS will validate this JWT against Supabase Auth / JWKS.
 */
export function loadAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function saveAuthSession(session: AuthSession | null) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY)
    return
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearAuthSession() {
  localStorage.removeItem(SESSION_KEY)
}

export async function getAccessToken(): Promise<string | null> {
  const session = loadAuthSession()
  if (!session?.accessToken) return null
  if (session.expiresAt && Date.now() >= session.expiresAt) {
    // Refresh via Supabase Auth will live here once the client SDK is connected.
    if (!isSupabaseAuthConfigured()) return null
    return null
  }
  return session.accessToken
}

export function authConfiguredSummary() {
  if (isSupabaseAuthConfigured()) {
    return `Supabase Auth ready · ${appConfig.supabaseUrl}`
  }
  return 'Supabase Auth not configured — using local workspace identity only'
}
