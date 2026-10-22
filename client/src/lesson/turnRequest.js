// How many recent messages the tutor sees. The plan and the current step's
// passages carry the lesson's context, so older chat isn't needed and every
// request stays small (cost, free-tier token limits).
const HISTORY_LENGTH = 12

// Builds the body of POST /api/lessons/turn from the lesson state.
export function buildTurnRequest(lesson, kind) {
  const { plan, currentStepIndex, document, teacherPrompt, messages } = lesson
  const step = plan.steps[currentStepIndex]

  return {
    kind,
    teacherPrompt,
    plan: {
      title: plan.title,
      language: plan.language,
      audience: plan.audience,
      steps: plan.steps.map(({ title, objective, checkQuestion }) => ({ title, objective, checkQuestion })),
    },
    stepIndex: currentStepIndex,
    passages: document.passages.filter((passage) => step.sourceIds.includes(passage.id)),
    messages: messages
      .filter((message) => message.text && message.status !== 'error' && message.status !== 'streaming')
      .slice(-HISTORY_LENGTH)
      .map(({ role, text }) => ({ role, text })),
  }
}
