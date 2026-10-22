import { createContext, useContext } from 'react'
import { STRINGS } from './strings'

export const LanguageContext = createContext('en')

// t('stepOf', { current: 2, total: 5 }) → "Step 2 of 5" in the interface language.
// A key missing in that language falls back to English.
export function useT() {
  const language = useContext(LanguageContext)
  return (key, params = {}) => {
    const text = STRINGS[language][key] ?? STRINGS.en[key] ?? key
    return text.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '')
  }
}

// An API error in the interface language: known codes are translated, other
// errors keep the server's (English) message.
export function useErrorMessage() {
  const language = useContext(LanguageContext)
  return (error) => STRINGS[language][`error.${error.code}`] ?? STRINGS.en[`error.${error.code}`] ?? error.message
}
