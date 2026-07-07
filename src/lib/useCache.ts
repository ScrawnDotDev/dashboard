import {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react"

const CACHE_PREFIX = "scrawn:cache:"

export const TTL = {
  DASHBOARD_SUMMARY: 5 * 60 * 1000,
  USAGE_OVER_TIME: 5 * 60 * 1000,
  AI_TOKEN_USAGE: 5 * 60 * 1000,
  PAYMENT_HISTORY: 5 * 60 * 1000,
  API_KEYS: 60 * 1000,
  TAGS: 2 * 60 * 1000,
  EXPRESSIONS: 2 * 60 * 1000,
  WEBHOOK_DELIVERIES: 30 * 1000,
  BACKEND_CONFIG: 5 * 60 * 1000,
} as const

interface StoredEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

function getFromCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    return (JSON.parse(raw) as StoredEntry<T>).data
  } catch {
    return null
  }
}

function isCacheFresh(key: string): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return false
    const entry: StoredEntry<unknown> = JSON.parse(raw)
    return Date.now() - entry.timestamp < entry.ttl
  } catch {
    return false
  }
}

function setInCache<T>(key: string, data: T, ttl: number): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, timestamp: Date.now(), ttl })
    )
  } catch {}
}

export function invalidateCache(key: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(CACHE_PREFIX + key)
  } catch {}
}

// ── Online status ────────────────────────────────────────────────────

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true
  )
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])
  return online
}

// ── Global refresh context ──────────────────────────────────────────

export interface RefreshContextType {
  version: number
  triggerRefresh: () => void
}

export const RefreshContext = createContext<RefreshContextType>({
  version: 0,
  triggerRefresh: () => {},
})

// ── Refreshing tracker (for the loading bar) ────────────────────────

let activeRefreshes = 0
const refreshListeners = new Set<(v: boolean) => void>()

export function startBackgroundRefresh() {
  activeRefreshes++
  if (activeRefreshes === 1) {
    for (const cb of refreshListeners) cb(true)
  }
}

export function endBackgroundRefresh() {
  activeRefreshes--
  if (activeRefreshes <= 0) {
    activeRefreshes = 0
    for (const cb of refreshListeners) cb(false)
  }
}

export function useIsRefreshing(): boolean {
  const [refreshing, setRefreshing] = useState(activeRefreshes > 0)
  useEffect(() => {
    refreshListeners.add(setRefreshing)
    return () => {
      refreshListeners.delete(setRefreshing)
    }
  }, [])
  return refreshing
}

// ── Cache timestamp helper (for offline banner) ─────────────────────

export function getCacheTimestamp(key: string): Date | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const entry: StoredEntry<unknown> = JSON.parse(raw)
    return new Date(entry.timestamp)
  } catch {
    return null
  }
}

export function hasAnyCachedData(): boolean {
  if (typeof window === "undefined") return false
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(CACHE_PREFIX)) return true
  }
  return false
}

// ── useCachedData hook ──────────────────────────────────────────────

interface CachedDataResult<T> {
  data: T | null
  loading: boolean
  refreshing: boolean
  offline: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 60000
): CachedDataResult<T> {
  const [data, setData] = useState<T | null>(() => getFromCache<T>(key))
  const [loading, setLoading] = useState(!data)
  const [refreshing, setRefreshing] = useState(false)
  const [offline, setOffline] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchId = useRef(0)
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  const ctx = useContext(RefreshContext)
  const online = useOnlineStatus()
  const onlineRef = useRef(online)
  onlineRef.current = online

  const doFetch = useCallback(
    async (background: boolean) => {
      const id = ++fetchId.current
      let didStartRefresh = false
      if (background) {
        setRefreshing(true)
        startBackgroundRefresh()
        didStartRefresh = true
      } else {
        setLoading(true)
      }
      setError(null)

      try {
        const result = await fetcherRef.current()
        if (id !== fetchId.current) return
        setData(result)
        setOffline(false)
        setInCache(key, result, ttl)
      } catch (err) {
        if (id !== fetchId.current) return
        if (!onlineRef.current) {
          setOffline(true)
        } else {
          setError(err instanceof Error ? err.message : "Request failed")
        }
      } finally {
        if (didStartRefresh) endBackgroundRefresh()
        if (id !== fetchId.current) return
        setLoading(false)
        setRefreshing(false)
      }
    },
    [key, ttl]
  )

  // Hydrate from cache on mount; fetch if missing or stale
  useEffect(() => {
    setError(null)
    const cached = getFromCache<T>(key)
    if (cached !== null && isCacheFresh(key)) {
      setData(cached)
      setLoading(false)
      return
    }
    if (cached !== null) {
      setData(cached)
      setLoading(false)
      if (online) {
        doFetch(true)
      } else {
        setOffline(true)
      }
    } else {
      if (online) {
        doFetch(false)
      } else {
        setLoading(false)
        setOffline(true)
      }
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for global refresh
  useEffect(() => {
    if (ctx.version > 0) {
      doFetch(true)
    }
  }, [ctx.version]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when coming back online
  const prevOnline = useRef(online)
  useEffect(() => {
    if (online && !prevOnline.current) {
      doFetch(true)
    }
    prevOnline.current = online
  }, [online]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-poll at TTL interval
  useEffect(() => {
    const interval = setInterval(() => doFetch(true), ttl)
    return () => clearInterval(interval)
  }, [ttl, key, doFetch]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    invalidateCache(key)
    await doFetch(false)
  }, [key, doFetch])

  return { data, loading, refreshing, offline, error, refresh }
}
