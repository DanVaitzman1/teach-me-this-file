import { LANGUAGES } from '../i18n/strings.js'

// Translations change display text only. The canonical plan stays the tutor's context.
export function getDisplayPlan(lesson, language) {
  const { plan } = lesson
  if (!plan || plan.language === language) return plan
  const translated = lesson.labelTranslations?.[language]
  if (translated?.status !== 'ready') return plan
  const stepsById = new Map(translated.labels.steps.map((step) => [step.id, step]))
  return {
    ...plan,
    title: translated.labels.title,
    audience: translated.labels.audience,
    language,
    dir: LANGUAGES[language].dir,
    steps: plan.steps.map((step) => ({
      ...step,
      title: stepsById.get(step.id)?.title ?? step.title,
      objective: stepsById.get(step.id)?.objective ?? step.objective,
    })),
  }
}
