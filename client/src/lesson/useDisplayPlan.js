import { useContext } from 'react'
import { LanguageContext } from '../i18n/context'
import { getDisplayPlan } from './displayPlan'

export function useDisplayPlan(lesson) {
  return getDisplayPlan(lesson, useContext(LanguageContext))
}
