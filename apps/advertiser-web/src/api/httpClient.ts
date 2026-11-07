import { appConfig } from '../lib/config'
import { getAccessToken } from '../lib/authSession'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

/**
 * NestJS REST client.
 * Sends Supabase Auth JWT when present. NestJS must validate the JWT and
 * enforce RBAC + Postgres RLS — never trust a companyId from the body alone.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!appConfig.apiBaseUrl) {
    throw new ApiError('NestJS API base URL is not configured (VITE_API_BASE_URL).', 0, null)
  }

  const token = await getAccessToken()
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${appConfig.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network request failed'
    throw new ApiError(
      `NestJS API unreachable (${appConfig.apiBaseUrl}): ${message}`,
      0,
      null,
    )
  }

  const text = await response.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      parsed = text
    }
  }

  if (!response.ok) {
    const message =
      typeof parsed === 'object' && parsed && 'message' in parsed
        ? Array.isArray((parsed as { message: unknown }).message)
          ? ((parsed as { message: string[] }).message).join(', ')
          : String((parsed as { message: unknown }).message)
        : `API request failed (${response.status})`
    throw new ApiError(message, response.status, parsed)
  }

  return parsed as T
}
