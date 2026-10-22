import { useEffect, useState } from 'react'
import { getHealth } from './api/health'

// A free Render instance sleeps when idle and needs up to a minute to wake.
// If the health check takes longer than this, we tell the user why.
const SLOW_AFTER_MS = 3000

// status: 'connecting' | 'slow' | 'ready' | 'error'
export function useServerStatus() {
  const [status, setStatus] = useState('connecting')
  const [hasServerKey, setHasServerKey] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const slowTimer = setTimeout(() => setStatus('slow'), SLOW_AFTER_MS)

    getHealth({ signal: controller.signal })
      .then((health) => {
        setHasServerKey(health.hasServerKey)
        setStatus('ready')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setStatus('error')
      })
      .finally(() => clearTimeout(slowTimer))

    return () => {
      controller.abort()
      clearTimeout(slowTimer)
    }
  }, [attempt])

  function retry() {
    setStatus('connecting')
    setAttempt((n) => n + 1)
  }

  return { status, hasServerKey, retry }
}
