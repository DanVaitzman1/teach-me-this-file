import { useEffect, useReducer, useRef } from 'react'
import { createPlan, streamTurn } from '../api/lessons'
import { initialLesson, lessonReducer } from './lessonReducer'
import { buildTurnRequest } from './turnRequest'

const STORAGE_KEY = 'lesson'

// A ready or finished lesson survives a page reload (same tab only). A lesson
// still being planned is not restored: that request died with the page, and so
// did a tutor message that was still streaming, which is kept as "stopped".
function loadLesson() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    if (saved?.status !== 'ready' && saved?.status !== 'finished') return initialLesson
    return {
      ...saved,
      messages: saved.messages.map((message) =>
        message.status === 'streaming' ? { ...message, status: 'stopped' } : message,
      ),
    }
  } catch {
    return initialLesson
  }
}

export function useLesson(apiKey) {
  const [lesson, dispatch] = useReducer(lessonReducer, undefined, loadLesson)
  const planAbortRef = useRef(null)
  const turnAbortRef = useRef(null)

  // Saved after each change, except while a message streams (that would write
  // the whole lesson for every few words).
  useEffect(() => {
    if (lesson.messages.some((message) => message.status === 'streaming')) return
    try {
      if (lesson.status === 'ready' || lesson.status === 'finished') {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lesson))
      }
      if (lesson.status === 'idle') sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage full or blocked: the lesson still works until the tab is reloaded.
    }
  }, [lesson])

  async function runTurn(snapshot, kind) {
    const controller = new AbortController()
    turnAbortRef.current = controller
    const id = crypto.randomUUID()
    dispatch({ type: 'tutor_turn_started', id, kind })

    let outcome
    try {
      const meta = await streamTurn(buildTurnRequest(snapshot, kind), {
        apiKey,
        signal: controller.signal,
        onDelta: (text) => dispatch({ type: 'tutor_delta', id, text }),
      })
      outcome = { type: 'tutor_turn_finished', id, meta }
    } catch (err) {
      outcome =
        err.name === 'AbortError'
          ? { type: 'tutor_turn_stopped', id }
          : { type: 'tutor_turn_failed', id, error: { code: err.code, message: err.message } }
    }
    // Cleared before dispatching, so the effect below can start the next turn
    // (e.g. opening the next step) as soon as this one is recorded.
    turnAbortRef.current = null
    dispatch(outcome)
  }

  // The reducer decides when the tutor should speak (pendingTurn); this runs it.
  // The ref check keeps a second request from starting while one is running
  // (React runs effects twice in development).
  useEffect(() => {
    if (lesson.status !== 'ready' || !lesson.pendingTurn || turnAbortRef.current) return
    runTurn(lesson, lesson.pendingTurn)
  })

  async function start(document, teacherPrompt) {
    planAbortRef.current?.abort()
    const controller = new AbortController()
    planAbortRef.current = controller
    dispatch({ type: 'planning_started', document, teacherPrompt })
    try {
      const plan = await createPlan({ passages: document.passages, teacherPrompt }, { apiKey, signal: controller.signal })
      dispatch({ type: 'plan_ready', plan })
    } catch (err) {
      if (err.name === 'AbortError') return
      dispatch({ type: 'plan_failed', error: { code: err.code, message: err.message } })
    }
  }

  return {
    lesson,
    start,
    retryPlan: () => start(lesson.document, lesson.teacherPrompt),
    sendMessage: (text) => dispatch({ type: 'student_message_sent', id: crypto.randomUUID(), text }),
    stop: () => turnAbortRef.current?.abort(),
    retryTurn: (id) => dispatch({ type: 'tutor_turn_retried', id }),
    // Also cancels a plan or tutor request that is still running.
    reset: () => {
      planAbortRef.current?.abort()
      turnAbortRef.current?.abort()
      dispatch({ type: 'reset' })
    },
  }
}
