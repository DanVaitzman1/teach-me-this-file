import { DocumentIcon } from '../../components/Icons'
import RichText from '../../components/RichText'
import ChatPanel from '../chat/ChatPanel'
import LessonProgress from './LessonProgress'
import StepList from './StepList'
import { useT } from '../../i18n/context'
import { useDisplayPlan } from '../../lesson/useDisplayPlan'
import LabelTranslationNotice from './LabelTranslationNotice'

export default function LessonScreen({ lesson, onDraftChange, onSend, onStop, onRetry, onNewLesson, onRetryLabels, onOpenSettings }) {
  const t = useT()
  const { currentStepIndex, document } = lesson
  const plan = useDisplayPlan(lesson)
  const step = plan.steps[currentStepIndex]
  const finished = lesson.status === 'finished'
  // When the lesson is finished every step counts as done.
  const doneUpTo = finished ? plan.steps.length : currentStepIndex

  // Controls follow the interface direction; generated labels carry their own
  // language while a translation loads. The conversation keeps its lesson language.
  // The chat takes the space left by the app shell, keeping the answer box visible.
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 lg:gap-4"
    >
      <header className="shrink-0">
        <div className="min-w-0 space-y-1.5">
          <h2 dir={plan.dir} lang={plan.language} className="line-clamp-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            <RichText inline>{plan.title}</RichText>
          </h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <span dir="auto" className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 ring-1 ring-indigo-100">
              {plan.audience}
            </span>
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">
              <DocumentIcon className="size-3.5 shrink-0" />
              <span dir="auto" className="truncate">
                {document.fileName}
              </span>
            </span>
            {document.pageCount && !document.truncated && (
              <span className="rounded-full bg-school-mint px-2.5 py-1 text-emerald-800">
                {t('pagesRead', { n: document.pageCount })}
              </span>
            )}
          </div>
        </div>
      </header>

      <LabelTranslationNotice lesson={lesson} onRetry={onRetryLabels} onOpenSettings={onOpenSettings} />

      {document.truncated && (
        <p dir="auto" className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {t('longFile')}
        </p>
      )}

      {document.method !== 'text' && !document.truncated && (
        <p className="shrink-0 text-xs text-slate-500">{t('extractionReview')}</p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 xl:grid xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-4">
        <aside className="hidden space-y-4 self-start rounded-2xl border border-emerald-200 bg-school-mint p-4 shadow-sm xl:block xl:max-h-full xl:overflow-y-auto">
          <LessonProgress current={Math.min(doneUpTo + 1, plan.steps.length)} done={doneUpTo} total={plan.steps.length} />
          <div dir={plan.dir} lang={plan.language}>
            <StepList steps={plan.steps} currentIndex={doneUpTo} />
          </div>
        </aside>
        {/* Expand over the chat rather than pushing its answer box off screen. */}
        <details className="relative z-10 shrink-0 rounded-xl border border-slate-200 bg-surface shadow-sm xl:hidden">
          <summary aria-label={t('allSteps')} className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5">
            <LessonProgress current={Math.min(doneUpTo + 1, plan.steps.length)} done={doneUpTo} total={plan.steps.length} compact />
            <span className="text-xs font-medium text-action">{t('allSteps')}</span>
          </summary>
          <div dir={plan.dir} lang={plan.language} className="absolute inset-x-0 top-full mt-1 max-h-[40dvh] overflow-y-auto rounded-xl border border-slate-200 bg-surface p-4 shadow-xl">
            <StepList steps={plan.steps} currentIndex={doneUpTo} />
          </div>
        </details>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm">
          <div className="border-b border-indigo-100 bg-school-sky px-4 py-2.5 lg:py-3">
            <p className="text-xs font-semibold tracking-wide text-action uppercase">
              {finished ? t('lessonCompleteLabel') : t('stepLabel', { n: currentStepIndex + 1 })}
            </p>
            <h3 dir={plan.dir} lang={plan.language} className="font-semibold text-slate-900">
              <RichText inline>{step.title}</RichText>
            </h3>
            <p dir={plan.dir} lang={plan.language} className="hidden text-sm text-slate-600 sm:block">
              <RichText inline>{step.objective}</RichText>
            </p>
          </div>
          <ChatPanel lesson={lesson} onDraftChange={onDraftChange} onSend={onSend} onStop={onStop} onRetry={onRetry} onNewLesson={onNewLesson} />
        </section>
      </div>
    </div>
  )
}
