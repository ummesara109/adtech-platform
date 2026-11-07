import { useCallback, useEffect, useState } from 'react'

export function useAsyncData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await loader()
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
