/**
 * Runtime config for the AutoAds advertiser portal.
 * Aligns with: NestJS REST, Supabase Auth, S3 creatives, ClickHouse analytics via API.
 */
export const appConfig = {
  appName: 'AutoAds',
  city: 'Bengaluru',
  /** NestJS REST base URL. Empty = offline empty-workspace mode. */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '',
  /** Supabase project URL (Auth + Postgres via NestJS). */
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '',
  /** Public anon key for Supabase Auth client — never a service role key. */
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '',
  /** CloudFront / S3 public media host for creative previews when wired. */
  mediaCdnUrl: (import.meta.env.VITE_MEDIA_CDN_URL as string | undefined)?.replace(/\/$/, '') ?? '',
}

export function isApiConfigured() {
  return Boolean(appConfig.apiBaseUrl)
}

export function isSupabaseAuthConfigured() {
  return Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey)
}
