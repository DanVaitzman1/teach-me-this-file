import { DocumentIcon } from '../../components/Icons'
import RichText from '../../components/RichText'
import ChatPanel from '../chat/ChatPanel'
import LessonProgress from './LessonProgress'
import StepList from './StepList'
import { useT } from '../../i18n/context'

export default function LessonScreen({ lesson, onSend, onStop, onRetry, onNewLesson }) {
  const t = useT()
  const { plan, currentStepIndex, document } = lesson
  const step = plan.steps[currentStepIndex]
  const finished = lesson.status === 'finished'
  // When the lesson is finished every step counts as done.
  const doneUpTo = finished ? plan.steps.length : currentStepIndex

  function confirmNewLesson() {
    if (finished || window.confirm(t('confirmNewLesson'))) onNewLesson()
  }

  // The whole lesson takes the plan's direction, so in Hebrew or Arabic the
  // layout mirrors too: outline on the right, progress filling from the right.
  // On phones the lesson is exactly one screen tall (under the app header) and
  // the chat takes whatever is left, so the answer box is always on screen.
  return (
    <div
      dir={plan.dir}
      lang={plan.language}
      className="flex h-[calc(100dvh-5.75rem)] min-h-[28rem] flex-col gap-3 lg:h-auto lg:gap-4"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            <RichText inline>{plan.title}</RichText>
          </h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 ring-1 ring-indigo-100">
              {plan.audience}
            </span>
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">
              <DocumentIcon className="size-3.5 shrink-0" />
              <span dir="auto" className="truncate">
                {document.fileName}
              </span>
            </span>
          </div>
        </div>
        <button
          onClick={confirmNewLesson}
          className="rounded-lg border border-slate-300 bg-surface px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
        >
          {t('newLesson')}
        </button>
      </header>

      {document.truncated && (
        <p dir="auto" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {t('longFile')}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[17rem_1fr] lg:gap-4">
        <aside className="space-y-3 rounded-2xl border border-slate-200 bg-surface p-3 shadow-sm lg:sticky lg:top-20 lg:space-y-4 lg:self-start lg:p-4">
          <LessonProgress current={Math.min(doneUpTo + 1, plan.steps.length)} done={doneUpTo} total={plan.steps.length} />
          {/* Phones: the outline folds away so the lesson stays on screen. */}
          <details className="lg:hidden">
            <summary className="cursor-pointer text-sm font-medium text-slate-600">{t('allSteps')}</summary>
            <div className="mt-3">
              <StepList steps={plan.steps} currentIndex={doneUpTo} />
            </div>
          </details>
          <div className="hidden lg:block">
            <StepList steps={plan.steps} currentIndex={doneUpTo} />
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-surface px-4 py-2.5 rtl:bg-gradient-to-l lg:py-3">
            <p className="text-xs font-semibold tracking-wide text-indigo-600 uppercase">
              {finished ? t('lessonCompleteLabel') : t('stepLabel', { n: currentStepIndex + 1 })}
            </p>
            <h3 className="font-semibold text-slate-900">
              <RichText inline>{step.title}</RichText>
            </h3>
            <p className="hidden text-sm text-slate-600 sm:block">
              <RichText inline>{step.objective}</RichText>
            </p>
          </div>
          <ChatPanel lesson={lesson} onSend={onSend} onStop={onStop} onRetry={onRetry} onNewLesson={onNewLesson} />
        </section>
      </div>
    </div>
  )
}
