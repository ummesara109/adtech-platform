import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthUser } from '../types/api'
import { authService } from '../services/authService'
import { driverService } from '../services/driverService'

type AuthContextValue = {
  user: AuthUser | null
  bootstrapping: boolean
  needsOnboarding: boolean
  setNeedsOnboarding: (v: boolean) => void
  login: (email: string, password: string) => Promise<void>
  loginDev: (email: string) => Promise<void>
  register: (input: {
    email: string
    fullName: string
    phone?: string
    password: string
    licenseNumber?: string
  }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function checkNeedsOnboarding(): Promise<boolean> {
  try {
    const [vehicle, device] = await Promise.all([driverService.vehicle(), driverService.device()])
    return !vehicle.vehicle || !device.assignment
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const restored = await authService.restoreSession()
        if (restored) {
          setUser(restored)
          setNeedsOnboarding(await checkNeedsOnboarding())
        }
      } finally {
        setBootstrapping(false)
      }
    })()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const u = await authService.login(email.trim().toLowerCase(), password)
    setUser(u)
    setNeedsOnboarding(await checkNeedsOnboarding())
  }, [])

  const loginDev = useCallback(async (email: string) => {
    const u = await authService.devLogin(email.trim().toLowerCase())
    setUser(u)
    setNeedsOnboarding(await checkNeedsOnboarding())
  }, [])

  const register = useCallback(
    async (input: {
      email: string
      fullName: string
      phone?: string
      password: string
      licenseNumber?: string
    }) => {
      const u = await authService.register({
        ...input,
        email: input.email.trim().toLowerCase(),
      })
      setUser(u)
      setNeedsOnboarding(true)
    },
    [],
  )

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
    setNeedsOnboarding(false)
  }, [])

  const value = useMemo(
    () => ({
      user,
      bootstrapping,
      needsOnboarding,
      setNeedsOnboarding,
      login,
      loginDev,
      register,
      logout,
    }),
    [user, bootstrapping, needsOnboarding, login, loginDev, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
