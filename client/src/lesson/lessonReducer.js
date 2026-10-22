// One lesson lives here, in app state, not in the chat history: the document,
// the teacher's instructions, the plan, where the student is in it, and the
// conversation. libraryReducer keeps many of these side by side.
//
// status: 'idle' → 'planning' → 'ready' → 'finished'
//                            ↘ 'plan_error' (retry → 'planning')
//
// pendingTurn says the tutor should speak next and why: 'start_step' (open the
// current step) or 'reply' (answer the student). useLessons sees it and runs
// the request, so the reducer alone decides when the tutor talks.
//
// message: { id, role: 'tutor' | 'student', text, stepIndex, status, kind?, sourceIds?, error? }
// status: 'streaming' | 'done' | 'stopped' | 'error'
export const initialLesson = {
  status: 'idle',
  document: null,
  teacherPrompt: '',
  plan: null,
  currentStepIndex: 0,
  messages: [],
  pendingTurn: null,
  error: null,
}

export function lessonReducer(state, action) {
  switch (action.type) {
    case 'planning_started':
      return { ...initialLesson, status: 'planning', document: action.document, teacherPrompt: action.teacherPrompt }
    case 'plan_ready':
      return { ...state, status: 'ready', plan: action.plan, currentStepIndex: 0, error: null, pendingTurn: 'start_step' }
    case 'plan_failed':
      return { ...state, status: 'plan_error', error: action.error }

    case 'student_message_sent':
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: action.id, role: 'student', text: action.text, stepIndex: state.currentStepIndex, status: 'done' },
        ],
        pendingTurn: 'reply',
      }
    case 'tutor_turn_started':
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: action.id, role: 'tutor', text: '', stepIndex: state.currentStepIndex, status: 'streaming', kind: action.kind },
        ],
        pendingTurn: null,
      }
    case 'tutor_delta':
      return updateMessage(state, action.id, (message) => ({ ...message, text: message.text + action.text }))
    case 'tutor_turn_finished': {
      const next = updateMessage(state, action.id, (message) => ({
        ...message,
        status: 'done',
        sourceIds: action.meta.sourceIds,
      }))
      if (!action.meta.stepComplete) return next
      const isLastStep = state.currentStepIndex === state.plan.steps.length - 1
      return isLastStep
        ? { ...next, status: 'finished' }
        : { ...next, currentStepIndex: state.currentStepIndex + 1, pendingTurn: 'start_step' }
    }
    case 'tutor_turn_stopped':
      // A stop before any text arrived leaves nothing worth showing.
      return {
        ...state,
        messages: state.messages
          .filter((message) => message.id !== action.id || message.text)
          .map((message) => (message.id === action.id ? { ...message, status: 'stopped' } : message)),
      }
    case 'tutor_turn_failed':
      return updateMessage(state, action.id, (message) => ({ ...message, status: 'error', error: action.error }))
    case 'tutor_turn_retried': {
      const failed = state.messages.find((message) => message.id === action.id)
      return {
        ...state,
        messages: state.messages.filter((message) => message.id !== action.id),
        pendingTurn: failed.kind,
      }
    }

    default:
      throw new Error(`Unknown lesson action: ${action.type}`)
  }
}

function updateMessage(state, id, update) {
  return { ...state, messages: state.messages.map((message) => (message.id === id ? update(message) : message)) }
}
