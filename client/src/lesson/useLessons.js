import { useEffect, useReducer, useRef } from 'react'
import { createPlan, streamTurn } from '../api/lessons'
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
        return [id, { ...lesson, messages }]
      }),
    )
    return { lessons, order, activeId: order.includes(saved.activeId) ? saved.activeId : null }
  } catch {
    return initialLibrary
  }
}

const isStreaming = (lesson) => lesson.messages.some((message) => message.status === 'streaming')

// All lessons and their requests. Requests keep running for lessons that are
// not on screen, so the student can switch away while a plan is prepared or
// the tutor is writing.
export function useLessons(apiKey) {
  const [library, dispatch] = useReducer(libraryReducer, undefined, loadLibrary)
  // lesson id → AbortController of its running plan or tutor request.
  const requests = useRef(new Map())

  const dispatchTo = (id, action) => dispatch({ type: 'lesson_action', id, action })

  // Saved after each change, except while a message streams (that would write
  // every lesson for every few words).
  useEffect(() => {
    const lessons = Object.values(library.lessons)
    if (lessons.some(isStreaming)) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(library))
    } catch {
      // Storage full or blocked: the lessons still work until the tab is reloaded.
    }
  }, [library])

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
    lessons: library.order.map((id) => ({ id, ...library.lessons[id] })),
    activeLesson: library.activeId && { id: library.activeId, ...library.lessons[library.activeId] },
    start,
    retryPlan,
    open: (id) => dispatch({ type: 'lesson_opened', id }),
    newLesson: () => dispatch({ type: 'lesson_opened', id: null }),
    sendMessage: (id, text) => dispatchTo(id, { type: 'student_message_sent', id: crypto.randomUUID(), text }),
    stop: (id) => requests.current.get(id)?.abort(),
    retryTurn: (id, messageId) => dispatchTo(id, { type: 'tutor_turn_retried', id: messageId }),
    // Also cancels the lesson's plan or tutor request if one is running.
    remove: (id) => {
      requests.current.get(id)?.abort()
      requests.current.delete(id)
      dispatch({ type: 'lesson_deleted', id })
    },
  }
}
