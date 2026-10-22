import { DocumentIcon } from '../../components/Icons'
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
    if (finished || window.confirm('Start a new lesson? This lesson will be lost.')) onNewLesson()
  }

  // The whole lesson takes the plan's direction, so in Hebrew or Arabic the
  // layout mirrors too: outline on the right, progress filling from the right.
  return (
    <div dir={plan.dir} lang={plan.language} className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            <RichText inline>{plan.title}</RichText>
          </h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 ring-1 ring-indigo-100">
              {plan.audience}
            </span>
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">
              <DocumentIcon className="size-3.5 shrink-0" />
              <span dir="auto" className="truncate">
                {document.fileName}
              </span>
            </span>
          </div>
        </div>
        <button
          onClick={confirmNewLesson}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
        >
          New lesson
        </button>
      </header>

      {document.truncated && (
        <p dir="auto" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          This file is long, so the lesson covers only its first part.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[17rem_1fr]">
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-20 lg:self-start">
          <LessonProgress current={Math.min(doneUpTo + 1, plan.steps.length)} done={doneUpTo} total={plan.steps.length} />
          {/* Phones: the outline folds away so the lesson stays on screen. */}
          <details className="lg:hidden">
            <summary className="cursor-pointer text-sm font-medium text-slate-600">All steps</summary>
            <div className="mt-3">
              <StepList steps={plan.steps} currentIndex={doneUpTo} />
            </div>
          </details>
          <div className="hidden lg:block">
            <StepList steps={plan.steps} currentIndex={doneUpTo} />
          </div>
        </aside>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-white px-4 py-3 rtl:bg-gradient-to-l">
            <p className="text-xs font-semibold tracking-wide text-indigo-600 uppercase">
              {finished ? 'Lesson complete' : `Step ${currentStepIndex + 1}`}
            </p>
            <h3 className="font-semibold text-slate-900">
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
