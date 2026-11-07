import { createContext, useContext, type ReactNode } from 'react'
import type { AdvertiserWorkspaceSnapshot } from '../api/advertiserWorkspace'
import { useAdvertiserWorkspace } from '../hooks/useAdvertiserWorkspace'

type WorkspaceContextValue = {
  data: AdvertiserWorkspaceSnapshot
  loading: boolean
  error: string | null
  connectionNotice: string | null
  apiConnected: boolean
  reload: () => void
}

const AdvertiserWorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function AdvertiserWorkspaceProvider({ children }: { children: ReactNode }) {
  const workspace = useAdvertiserWorkspace()
  return <AdvertiserWorkspaceContext.Provider value={workspace}>{children}</AdvertiserWorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(AdvertiserWorkspaceContext)
  if (!ctx) throw new Error('AdvertiserWorkspaceProvider is required')
  return ctx
}
