import { useState } from 'react'

const STORAGE_KEY = 'gemini-api-key'

// sessionStorage keeps the key for this tab only and can throw
// (private mode, blocked storage), so every access is guarded.
function readStoredKey() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState(readStoredKey)

  function setApiKey(value) {
    const key = value.trim()
    setApiKeyState(key)
    try {
      if (key) sessionStorage.setItem(STORAGE_KEY, key)
      else sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage unavailable: the key still works until the tab is reloaded.
    }
  }

  return [apiKey, setApiKey]
}
