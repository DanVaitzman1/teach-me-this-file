import { useEffect, useState } from 'react'
import { LANGUAGES } from '../../i18n/strings'

// Per-device display preferences, kept across visits in localStorage
// (index.html reads the same key before React loads, to avoid a flash).
const STORAGE_KEY = 'preferences'
const DEFAULTS = { theme: 'system', language: 'en' }

function readPreferences() {
  try {
    const saved = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }
    return { ...saved, language: LANGUAGES[saved.language] ? saved.language : DEFAULTS.language }
  } catch {
    return DEFAULTS
  }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState(readPreferences)

  function setPreference(name, value) {
    const next = { ...preferences, [name]: value }
    setPreferences(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage blocked: the choice still applies until the page is reloaded.
    }
  }

  // Theme: the "dark" class on <html> switches the color palette (see index.css).
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = preferences.theme === 'dark' || (preferences.theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [preferences.theme])

  // Language: the whole interface mirrors for right-to-left languages.
  useEffect(() => {
    document.documentElement.lang = preferences.language
    document.documentElement.dir = LANGUAGES[preferences.language].dir
  }, [preferences.language])

  return [preferences, setPreference]
}
