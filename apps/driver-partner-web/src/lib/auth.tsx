import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { driverApi, getToken, setToken } from './api'

type User = { fullName: string; email: string; driverId: string }

type AuthCtx = {
  user: User | null
  token: string | null
  login: (email: string) => Promise<void>
  register: (input: { email: string; fullName: string; phone?: string }) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTok] = useState<string | null>(() => getToken())
  const [user, setUser] = useState<User | null>(null)

  const login = useCallback(async (email: string) => {
    const res = await driverApi.login(email)
    setToken(res.accessToken)
    setTok(res.accessToken)
    setUser(res.user)
  }, [])

  const register = useCallback(async (input: { email: string; fullName: string; phone?: string }) => {
    const res = await driverApi.register(input)
    setToken(res.accessToken)
    setTok(res.accessToken)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setTok(null)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, token, login, register, logout }), [user, token, login, register, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}
