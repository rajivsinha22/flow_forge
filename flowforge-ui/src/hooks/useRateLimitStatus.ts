import { useEffect, useState, useRef } from 'react'
import { getRateLimitUsage } from '../api/settings'

interface RateLimitStatus {
  used: number
  limit: number
  percentage: number
  isLoading: boolean
  error: string | null
}

export function useRateLimitStatus(pollIntervalMs = 5000) {
  const [status, setStatus] = useState<RateLimitStatus>({
    used: 0,
    limit: 0,
    percentage: 0,
    isLoading: true,
    error: null,
  })

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const fetchStatus = async () => {
    try {
      const data = await getRateLimitUsage()
      if (mountedRef.current) {
        setStatus({ ...data, isLoading: false, error: null })
      }
    } catch (err) {
      if (mountedRef.current) {
        setStatus((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to fetch rate limit status',
        }))
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true
    fetchStatus()

    intervalRef.current = setInterval(fetchStatus, pollIntervalMs)

    return () => {
      mountedRef.current = false
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [pollIntervalMs])

  return status
}
