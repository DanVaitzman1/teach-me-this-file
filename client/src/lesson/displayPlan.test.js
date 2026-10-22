import assert from 'node:assert/strict'
import test from 'node:test'
import { LANGUAGES, STRINGS } from '../i18n/strings.js'
import { getDisplayPlan } from './displayPlan.js'
import { initialLesson, lessonReducer } from './lessonReducer.js'

const plan = {
  title: 'Powers', language: 'en', dir: 'ltr', audience: 'Grade 7',
  steps: [
    { id: 's1', title: 'The base', objective: 'Find the base', checkQuestion: 'Which base?', sourceIds: ['p1'] },
    { id: 's2', title: 'The exponent', objective: 'Find the exponent', checkQuestion: 'Which exponent?', sourceIds: ['p2'] },
  ],
}
const french = {
  title: 'Les puissances', audience: 'Collège',
  steps: [
    { id: 's2', title: 'L’exposant', objective: 'Trouver l’exposant' },
    { id: 's1', title: 'La base', objective: 'Trouver la base' },
  ],
}

test('translated labels follow step ids and preserve the canonical teaching plan', () => {
  const lesson = { ...initialLesson, plan, labelTranslations: { fr: { status: 'ready', labels: french } } }
  const displayed = getDisplayPlan(lesson, 'fr')
  assert.equal(displayed.title, 'Les puissances')
  assert.equal(displayed.steps[0].title, 'La base')
  assert.equal(displayed.steps[1].title, 'L’exposant')
  assert.equal(displayed.steps[0].checkQuestion, 'Which base?')
  assert.deepEqual(displayed.steps[0].sourceIds, ['p1'])
  assert.equal(lesson.plan.title, 'Powers')
  assert.equal(lesson.plan.language, 'en')
  assert.equal(getDisplayPlan(lesson, 'en'), plan)
})

test('a late translation is cached only for its requested language without resetting progress or history', () => {
  let lesson = { ...initialLesson, plan, status: 'ready', currentStepIndex: 1, draft: 'Keep my answer', messages: [{ id: 'm1', text: 'Original chat' }] }
  lesson = lessonReducer(lesson, { type: 'labels_translation_started', language: 'fr' })
  lesson = lessonReducer(lesson, { type: 'labels_translation_started', language: 'ar' })
  lesson = lessonReducer(lesson, { type: 'labels_translation_ready', language: 'fr', labels: french })
  assert.equal(getDisplayPlan(lesson, 'ar'), plan)
  assert.equal(getDisplayPlan(lesson, 'fr').title, 'Les puissances')
  assert.equal(lesson.currentStepIndex, 1)
  assert.equal(lesson.draft, 'Keep my answer')
  assert.equal(lesson.messages[0].text, 'Original chat')
  assert.equal(lesson.pendingTurn, null)
})

test('retrying a failed translation preserves other cached languages and a new plan clears old labels', () => {
  let lesson = { ...initialLesson, plan, labelTranslations: { fr: { status: 'ready', labels: french }, ar: { status: 'error' } } }
  lesson = lessonReducer(lesson, { type: 'labels_translation_retried', language: 'ar' })
  assert.equal(lesson.labelTranslations.ar, undefined)
  assert.equal(getDisplayPlan(lesson, 'fr').title, 'Les puissances')
  lesson = lessonReducer(lesson, { type: 'plan_ready', plan: { ...plan, title: 'A different lesson' } })
  assert.deepEqual(lesson.labelTranslations, {})
})

test('all five interface languages cover every string and preserve replacement parameters', () => {
  const params = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
  assert.deepEqual(Object.keys(LANGUAGES).sort(), ['ar', 'en', 'es', 'fr', 'he'])
  for (const [language, strings] of Object.entries(STRINGS)) {
    assert.deepEqual(Object.keys(strings).sort(), Object.keys(STRINGS.en).sort(), language)
    for (const key of Object.keys(STRINGS.en)) assert.deepEqual(params(strings[key]), params(STRINGS.en[key]), `${language}.${key}`)
  }
})
