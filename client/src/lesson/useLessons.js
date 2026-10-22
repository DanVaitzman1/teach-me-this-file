import { useEffect, useReducer, useRef } from 'react'
import { createPlan, streamTurn, translateLabels } from '../api/lessons'
import { initialLibrary, libraryReducer } from './libraryReducer'
import { buildTurnRequest } from './turnRequest'

const STORAGE_KEY = 'lessons'

// Ready and finished lessons survive a page reload (same tab only). Lessons
// still being planned are not restored: those requests died with the page, and
// so did tutor messages that were still streaming, which are kept as "stopped".
function loadLibrary() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    if (!saved) return initialLibrary
    const order = saved.order.filter((id) => ['ready', 'finished'].includes(saved.lessons[id]?.status))
    const lessons = Object.fromEntries(
      order.map((id) => {
        const lesson = saved.lessons[id]
        const messages = lesson.messages.map((message) =>
          message.status === 'streaming' ? { ...message, status: 'stopped' } : message,
        )
        const labelTranslations = Object.fromEntries(
          Object.entries(lesson.labelTranslations ?? {}).filter(([, translation]) => translation.status === 'ready'),
        )
        return [id, { draft: '', hasUnreadReply: false, ...lesson, messages, labelTranslations }]
      }),
    )
    return { lessons, order, activeId: order.includes(saved.activeId) ? saved.activeId : null }
  } catch {
    return initialLibrary
  }
}

const isStreaming = (lesson) => lesson.messages.some((message) => message.status === 'streaming')

function saveLibrary(library) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(library))
    return true
  } catch {
    // Avoid restoring an obsolete conversation after a failed write.
    try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* Storage may be blocked. */ }
    return false
  }
}

// All lessons and their requests. Requests keep running for lessons that are
// not on screen, so the student can switch away while a plan is prepared or
// the tutor is writing.
export function useLessons(apiKey, language) {
  const [library, dispatch] = useReducer(libraryReducer, undefined, loadLibrary)
  // lesson id → AbortController of its running plan or tutor request.
  const requests = useRef(new Map())
  const labelRequests = useRef(new Map())
  const latestLibrary = useRef(library)
  const saveTimer = useRef(null)

  const dispatchTo = (id, action) => dispatch({ type: 'lesson_action', id, action })
  function persist(value) {
    const full = !saveLibrary(value)
    if (Boolean(value.storageFull) !== full) dispatch({ type: 'storage_changed', full })
  }

  // Throttle writes during streaming, so drafts in other lessons still get saved.
  // Save immediately once all streams settle, and before a reload leaves the page.
  useEffect(() => {
    latestLibrary.current = library
    const lessons = Object.values(library.lessons)
    if (!lessons.some(isStreaming)) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
      persist(library)
    } else if (!saveTimer.current) {
      saveTimer.current = setTimeout(() => {
        persist(latestLibrary.current)
        saveTimer.current = null
      }, 500)
    }
  }, [library])

  useEffect(() => {
    const saveOnLeave = () => persist(latestLibrary.current)
    window.addEventListener('pagehide', saveOnLeave)
    return () => {
      window.removeEventListener('pagehide', saveOnLeave)
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
  }, [])

  async function runTurn(lessonId, lesson, kind) {
    const controller = new AbortController()
    requests.current.set(lessonId, controller)
    const messageId = crypto.randomUUID()
    dispatchTo(lessonId, { type: 'tutor_turn_started', id: messageId, kind })

    let outcome
    try {
      const meta = await streamTurn(buildTurnRequest(lesson, kind), {
        apiKey,
        signal: controller.signal,
        onDelta: (text) => dispatchTo(lessonId, { type: 'tutor_delta', id: messageId, text }),
      })
      outcome = { type: 'tutor_turn_finished', id: messageId, meta }
    } catch (err) {
      outcome =
        err.name === 'AbortError'
          ? { type: 'tutor_turn_stopped', id: messageId }
          : { type: 'tutor_turn_failed', id: messageId, error: { code: err.code, message: err.message } }
    }
    // Cleared before dispatching, so the effect below can start the next turn
    // (e.g. opening the next step) as soon as this one is recorded.
    requests.current.delete(lessonId)
    dispatchTo(lessonId, outcome)
  }

  // The reducer decides when a tutor should speak (pendingTurn); this runs it,
  // for every lesson. The map check keeps a second request for the same lesson
  // from starting while one is running (React runs effects twice in development).
  useEffect(() => {
    for (const [id, lesson] of Object.entries(library.lessons)) {
      if (lesson.status === 'ready' && lesson.pendingTurn && !requests.current.has(id)) {
        runTurn(id, lesson, lesson.pendingTurn)
      }
    }
  })

  async function runLabelTranslation(lessonId, plan) {
    const key = `${lessonId}:${language}`
    const controller = new AbortController()
    labelRequests.current.set(key, { lessonId, controller })
    dispatchTo(lessonId, { type: 'labels_translation_started', language })
    try {
      const labels = await translateLabels({
        language,
        labels: {
          title: plan.title,
          audience: plan.audience,
          steps: plan.steps.map(({ id, title, objective }) => ({ id, title, objective })),
        },
      }, { apiKey, signal: controller.signal })
      labelRequests.current.delete(key)
      dispatchTo(lessonId, { type: 'labels_translation_ready', language, labels })
    } catch (err) {
      labelRequests.current.delete(key)
      dispatchTo(lessonId, { type: 'labels_translation_failed', language, error: { code: err.code, message: err.message } })
    }
  }

  // Cache by lesson and language. Two requests at most, independent of tutor streams.
  // A late result is cached under its requested language, never the newly selected one.
  useEffect(() => {
    for (const id of library.order) {
      const lesson = library.lessons[id]
      if (labelRequests.current.size >= 2) break
      if (lesson.plan && lesson.plan.language !== language && !lesson.labelTranslations?.[language] &&
          !labelRequests.current.has(`${id}:${language}`)) runLabelTranslation(id, lesson.plan)
    }
  })

  async function runPlan(lessonId, document, teacherPrompt) {
    const controller = new AbortController()
    requests.current.set(lessonId, controller)
    let outcome
    try {
      const plan = await createPlan({ passages: document.passages, teacherPrompt }, { apiKey, signal: controller.signal })
      outcome = { type: 'plan_ready', plan }
    } catch (err) {
      if (err.name === 'AbortError') return
      outcome = { type: 'plan_failed', error: { code: err.code, message: err.message } }
    } finally {
      requests.current.delete(lessonId)
    }
    dispatchTo(lessonId, outcome)
  }

  function start(document, teacherPrompt) {
    const id = crypto.randomUUID()
    dispatch({ type: 'lesson_created', id, document, teacherPrompt })
    runPlan(id, document, teacherPrompt)
  }

  function retryPlan(id) {
    const { document, teacherPrompt } = library.lessons[id]
    dispatchTo(id, { type: 'planning_started', document, teacherPrompt })
    runPlan(id, document, teacherPrompt)
  }

  return {
    storageFull: Boolean(library.storageFull),
    lessons: library.order.map((id) => ({ id, ...library.lessons[id] })),
    activeLesson: library.activeId && { id: library.activeId, ...library.lessons[library.activeId] },
    start,
    retryPlan,
    retryLabels: (id) => dispatchTo(id, { type: 'labels_translation_retried', language }),
    open: (id) => dispatch({ type: 'lesson_opened', id }),
    newLesson: () => dispatch({ type: 'lesson_opened', id: null }),
    sendMessage: (id, text) => dispatchTo(id, { type: 'student_message_sent', id: crypto.randomUUID(), text }),
    setDraft: (id, text) => dispatchTo(id, { type: 'draft_changed', text }),
    stop: (id) => requests.current.get(id)?.abort(),
    retryTurn: (id, messageId) => dispatchTo(id, { type: 'tutor_turn_retried', id: messageId }),
    // Also cancels the lesson's plan or tutor request if one is running.
    remove: (id) => {
      requests.current.get(id)?.abort()
      requests.current.delete(id)
      for (const [key, request] of labelRequests.current) {
        if (request.lessonId === id) {
          request.controller.abort()
          labelRequests.current.delete(key)
        }
      }
      dispatch({ type: 'lesson_deleted', id })
    },
  }
}
