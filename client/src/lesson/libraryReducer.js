import { initialLesson, lessonReducer } from './lessonReducer.js'

// Several independent lessons, each one a lessonReducer state.
// order: lesson ids, most recently opened first. activeId: the lesson on
// screen, or null for the upload screen (starting a new lesson).
export const initialLibrary = { lessons: {}, order: [], activeId: null }

// Each lesson holds its whole document, and all of them share the browser's
// storage quota, so the oldest lessons are dropped beyond this many.
const MAX_LESSONS = 8

export function libraryReducer(state, action) {
  switch (action.type) {
    case 'lesson_created': {
      const lesson = lessonReducer(initialLesson, {
        type: 'planning_started',
        document: action.document,
        teacherPrompt: action.teacherPrompt,
      })
      const order = [action.id, ...state.order].slice(0, MAX_LESSONS)
      return { ...state, lessons: pick({ ...state.lessons, [action.id]: lesson }, order), order, activeId: action.id }
    }
    // Any single-lesson action, routed to its lesson. Requests for a lesson
    // that was deleted meanwhile are ignored.
    case 'lesson_action': {
      const lesson = state.lessons[action.id]
      if (!lesson) return state
      const updated = lessonReducer(lesson, action.action)
      const replyArrived = action.action.type === 'tutor_turn_finished' && state.activeId !== action.id
      return {
        ...state,
        lessons: { ...state.lessons, [action.id]: { ...updated, hasUnreadReply: updated.hasUnreadReply || replyArrived } },
      }
    }
    case 'lesson_opened':
      if (action.id && !state.lessons[action.id]) return state
      return {
        ...state,
        activeId: action.id,
        lessons: action.id
          ? { ...state.lessons, [action.id]: { ...state.lessons[action.id], hasUnreadReply: false } }
          : state.lessons,
        order: action.id ? [action.id, ...state.order.filter((id) => id !== action.id)] : state.order,
      }
    case 'lesson_deleted': {
      const order = state.order.filter((id) => id !== action.id)
      return {
        ...state,
        lessons: pick(state.lessons, order),
        order,
        activeId: state.activeId === action.id ? null : state.activeId,
      }
    }
    case 'storage_changed':
      return state.storageFull === action.full ? state : { ...state, storageFull: action.full }
    default:
      throw new Error(`Unknown library action: ${action.type}`)
  }
}

function pick(lessons, ids) {
  return Object.fromEntries(ids.map((id) => [id, lessons[id]]))
}
