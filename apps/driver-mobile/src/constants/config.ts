const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000'

export const config = {
  apiBaseUrl: apiBase.replace(/\/$/, ''),
  apiPrefix: '/api/v1',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  tokenStorageKey: 'autoads_driver_access_token',
}

export function apiUrl(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${config.apiBaseUrl}${config.apiPrefix}${p}`
}
