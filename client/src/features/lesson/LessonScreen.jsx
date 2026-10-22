import RichText from '../../components/RichText'
import ChatPanel from '../chat/ChatPanel'
import LessonProgress from './LessonProgress'
import StepList from './StepList'

export default function LessonScreen({ lesson, onSend, onStop, onRetry, onNewLesson }) {
  const { plan, currentStepIndex, document } = lesson
  const step = plan.steps[currentStepIndex]
  const finished = lesson.status === 'finished'
  // When the lesson is finished every step counts as done.
  const doneUpTo = finished ? plan.steps.length : currentStepIndex

  function confirmNewLesson() {
    if (window.confirm('Start a new lesson? This lesson will be lost.')) onNewLesson()
  }

  // The whole lesson takes the plan's direction, so in Hebrew or Arabic the
  // layout mirrors too: outline on the right, progress filling from the right.
  return (
    <div dir={plan.dir} lang={plan.language} className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-xl font-semibold">
            <RichText inline>{plan.title}</RichText>
          </h2>
          <p className="text-sm text-slate-600">
            {plan.audience} · <span dir="auto">{document.fileName}</span>
          </p>
        </div>
        <button
          onClick={confirmNewLesson}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          New lesson
        </button>
      </header>

      {document.truncated && (
        <p dir="auto" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          This file is long, so the lesson covers only its first part.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 lg:self-start">
          <LessonProgress current={Math.min(doneUpTo + 1, plan.steps.length)} total={plan.steps.length} />
          {/* Phones: the outline folds away so the lesson stays on screen. */}
          <details className="lg:hidden">
            <summary className="cursor-pointer text-sm font-medium text-slate-600">All steps</summary>
            <div className="mt-2">
              <StepList steps={plan.steps} currentIndex={doneUpTo} />
            </div>
          </details>
          <div className="hidden lg:block">
            <StepList steps={plan.steps} currentIndex={doneUpTo} />
          </div>
        </aside>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="space-y-0.5 border-b border-slate-200 px-4 py-3">
            <h3 className="font-semibold">
              <RichText inline>{step.title}</RichText>
            </h3>
            <p className="text-sm text-slate-600">
              <RichText inline>{step.objective}</RichText>
            </p>
          </div>
          <ChatPanel lesson={lesson} onSend={onSend} onStop={onStop} onRetry={onRetry} onNewLesson={onNewLesson} />
        </section>
      </div>
    </div>
  )
}
