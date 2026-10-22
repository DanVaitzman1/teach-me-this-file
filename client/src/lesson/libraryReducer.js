import { initialLesson, lessonReducer } from './lessonReducer'

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
      return { lessons: pick({ ...state.lessons, [action.id]: lesson }, order), order, activeId: action.id }
    }
    // Any single-lesson action, routed to its lesson. Requests for a lesson
    // that was deleted meanwhile are ignored.
    case 'lesson_action': {
      const lesson = state.lessons[action.id]
      if (!lesson) return state
      return { ...state, lessons: { ...state.lessons, [action.id]: lessonReducer(lesson, action.action) } }
    }
    case 'lesson_opened':
      return {
        ...state,
        activeId: action.id,
        order: action.id ? [action.id, ...state.order.filter((id) => id !== action.id)] : state.order,
      }
    case 'lesson_deleted': {
      const order = state.order.filter((id) => id !== action.id)
      return {
        lessons: pick(state.lessons, order),
        order,
        activeId: state.activeId === action.id ? null : state.activeId,
      }
    }
    default:
      throw new Error(`Unknown library action: ${action.type}`)
  }
}

function pick(lessons, ids) {
  return Object.fromEntries(ids.map((id) => [id, lessons[id]]))
}
