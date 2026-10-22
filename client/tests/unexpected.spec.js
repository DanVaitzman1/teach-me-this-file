import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { STRINGS } from '../src/i18n/strings.js'

function makePlan(language) {
  return { title: 'Maths', audience: 'Grade 7', language, dir: ['ar', 'he'].includes(language) ? 'rtl' : 'ltr',
    steps: [{ id: 's1', title: 'Powers', objective: 'Understand $3^2$', checkQuestion: 'Why?', sourceIds: ['p1'] }] }
}

async function preferences(page, profile, library) {
  await page.addInitScript(({ profile, library }) => {
    localStorage.setItem('preferences', JSON.stringify(profile))
    sessionStorage.setItem('gemini-api-key', 'test-key')
    if (library) sessionStorage.setItem('lessons', JSON.stringify(library))
  }, { profile, library })
}

test('upload errors recover and a full browser store does not silently lose the current session', async ({ page }, testInfo) => {
  const profile = testInfo.project.metadata
  const t = STRINGS[profile.language]
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await preferences(page, profile)
  let plans = 0
  // Exercise the real ingestion API; only planning/tutoring are stubbed.
  await page.route('**/api/lessons/plan', (route) => { plans++; return route.fulfill({ json: makePlan(profile.language) }) })
  await page.route('**/api/lessons/turn', (route) => route.fulfill({ contentType: 'text/event-stream',
    body: 'event: delta\ndata: {"text":"Try $3^2$. What does it mean?"}\n\nevent: meta\ndata: {"stepComplete":false,"sourceIds":["p1"]}\n\n' }))
  await page.goto('/')
  await expect(page.locator('#teacher-prompt')).toBeVisible()
  await expect(page.getByText(t.upToMB.replace('{n}', '25'), { exact: true })).toBeVisible()
  await page.locator('#teacher-prompt').fill('Teach this.')
  for (const [name, buffer, code] of [
    ['broken.pdf', Buffer.from('Not a PDF'), 'UNREADABLE_FILE'],
    ['too-long.txt', Buffer.from('a'.repeat(500_001)), 'DOCUMENT_TOO_LONG'],
    ['too-large.txt', Buffer.alloc(25 * 1024 * 1024 + 1), 'FILE_TOO_LARGE'],
  ]) {
    await page.locator('input[type=file]').setInputFiles({ name, mimeType: 'application/octet-stream', buffer })
    if (code !== 'FILE_TOO_LARGE') await page.getByRole('button', { name: t.startLesson, exact: true }).click()
    await expect(page.getByRole('alert')).toContainText(t[`error.${code}`])
    expect(plans).toBe(0)
  }
  await page.locator('input[type=file]').setInputFiles({ name: 'valid.txt', mimeType: 'text/plain', buffer: Buffer.from('Powers repeat multiplication. $3^2 = 3 × 3 = 9$.') })
  await page.getByRole('button', { name: t.startLesson, exact: true }).click()
  await expect(page.getByRole('button', { name: t.viewSource, exact: true })).toBeVisible()
  expect(plans).toBe(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(profile.width)

  await page.evaluate(() => {
    const write = Storage.prototype.setItem
    window.blockLessonSave = true
    Storage.prototype.setItem = function (key, value) {
      if (key === 'lessons' && window.blockLessonSave) throw new DOMException('Quota exceeded', 'QuotaExceededError')
      return write.call(this, key, value)
    }
  })
  await page.locator('#student-message').fill('Keep this draft')
  await expect(page.getByRole('alert')).toContainText(t.storageFull)
  expect(await page.evaluate(() => sessionStorage.getItem('lessons'))).toBeNull()
  const box = await page.locator('#student-message').boundingBox()
  expect(box.y + box.height).toBeLessThanOrEqual(profile.width < 500 ? 812 : 1000)
  await page.evaluate(() => { window.blockLessonSave = false })
  await page.locator('#student-message').fill('Recovered draft')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('#student-message')).toHaveValue('Recovered draft')
  expect(errors).toEqual([])
})

test('leaving a pending upload cancels it and cannot later replace the selected lesson', async ({ page }, testInfo) => {
  const profile = testInfo.project.metadata
  const t = STRINGS[profile.language]
  const existing = { status: 'ready', document: { fileName: 'old.txt', method: 'text', passages: [{ id: 'p1', page: null, text: 'Old material' }] },
    teacherPrompt: 'Teach this.', plan: { ...makePlan(profile.language), title: 'Existing lesson' }, currentStepIndex: 0,
    messages: [{ id: 'm1', role: 'tutor', status: 'done', stepIndex: 0, sourceIds: ['p1'], text: 'What does $3^2$ mean?' }],
    pendingTurn: null, draft: '', error: null }
  await preferences(page, profile, { lessons: { old: existing }, order: ['old'], activeId: null })
  let releaseUpload
  const held = new Promise((resolve) => { releaseUpload = resolve })
  await page.route('**/api/documents', async (route) => {
    await held
    await route.fulfill({ json: existing.document }).catch(() => {})
  })
  let plans = 0
  await page.route('**/api/lessons/plan', (route) => { plans++; return route.abort() })
  await page.goto('/')
  await page.locator('input[type=file]').setInputFiles({ name: 'pending.txt', mimeType: 'text/plain', buffer: Buffer.from('Pending material') })
  await page.locator('#teacher-prompt').fill('Teach this.')
  const requested = page.waitForRequest((request) => request.url().endsWith('/api/documents'))
  await page.getByRole('button', { name: t.startLesson, exact: true }).click()
  await requested
  if (profile.width < 1024) await page.getByRole('button', { name: t.lessons, exact: true }).click()
  const region = profile.width < 1024 ? page.getByRole('dialog') : page.getByRole('navigation')
  await region.getByRole('button', { name: /Existing lesson/ }).click()
  releaseUpload()
  await expect(page.locator('main h2')).toHaveText('Existing lesson')
  await page.waitForTimeout(300)
  expect(plans).toBe(0)
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('lessons')).activeId)).toBe('old')
})
