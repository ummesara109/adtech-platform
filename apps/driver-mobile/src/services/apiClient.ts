import { apiUrl } from '../constants/config'
import { getStoredToken, setStoredToken } from './tokenStorage'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function setAccessToken(token: string | null) {
  await setStoredToken(token)
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> | undefined),
  }

  if (options.auth !== false) {
    const token = await getStoredToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(apiUrl(path), {
    ...options,
    headers,
  })

  if (res.status === 401) {
    await setAccessToken(null)
    throw new ApiError('Session expired. Please sign in again.', 401)
  }

  const text = await res.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!res.ok) {
    const message =
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message: string | string[] }).message)
        : `Request failed (${res.status})`
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status)
  }

  return body as T
}
