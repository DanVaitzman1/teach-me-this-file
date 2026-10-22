import { CheckIcon, CloseIcon, DocumentIcon } from '../../components/Icons'
import RichText from '../../components/RichText'
import { useT } from '../../i18n/context'
import { useDisplayPlan } from '../../lesson/useDisplayPlan'

// Where a lesson stands, as a short label and a state for the icon.
function summarize(lesson, t) {
  if (lesson.status === 'planning') return { state: 'busy', label: t('lessonPreparing') }
  if (lesson.status === 'plan_error') return { state: 'error', label: t('lessonPlanFailed') }
  if (lesson.status === 'finished') return { state: 'done', label: t('lessonDone') }
  if (lesson.messages.some((message) => message.status === 'streaming')) {
    return { state: 'busy', label: t('tutorWritingShort') }
  }
  const total = lesson.plan.steps.length
  return { state: 'active', label: t('stepOf', { current: lesson.currentStepIndex + 1, total }) }
}

const ICON_STYLES = {
  busy: 'bg-indigo-100 text-action',
  error: 'bg-red-100 text-red-600',
  done: 'bg-emerald-100 text-emerald-700',
  active: 'bg-indigo-600 text-white',
}

// One lesson in a list: title (or file name before there is a plan), status, open and delete.
export default function LessonCard({ lesson, active, onOpen, onDelete }) {
  const t = useT()
  const plan = useDisplayPlan(lesson)
  const { state, label } = summarize(lesson, t)
  const progress = lesson.plan ? (lesson.status === 'finished' ? 1 : lesson.currentStepIndex / lesson.plan.steps.length) : 0

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-xl border p-3 transition-colors ${
        active ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-surface hover:border-indigo-200 hover:bg-slate-50'
      }`}
    >
      <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${ICON_STYLES[state]}`}>
        {state === 'busy' ? (
          <span className="size-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        ) : state === 'done' ? (
          <CheckIcon className="size-5" />
        ) : (
          <DocumentIcon className="size-5" />
        )}
      </span>

      <button onClick={onOpen} className="min-w-0 flex-1 text-start after:absolute after:inset-0" aria-current={active || undefined}>
        <span className="flex min-w-0 items-center gap-2">
          <span dir={plan?.dir ?? 'auto'} lang={plan?.language} className="min-w-0 flex-1 truncate font-medium text-slate-900">
            {plan ? <RichText inline>{plan.title}</RichText> : lesson.document.fileName}
          </span>
          {lesson.hasUnreadReply && (
            <span role="status" aria-label={t('newReply')} title={t('newReply')} className="size-2 shrink-0 rounded-full bg-emerald-500" />
          )}
        </span>
        <span className="flex items-center gap-2 text-xs text-slate-500">
          <span>{label}</span>
          {lesson.plan && (
            <span className="h-1 w-16 overflow-hidden rounded-full bg-slate-200">
              <span
                className={`block h-full rounded-full ${state === 'done' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.max(progress * 100, 6)}%` }}
              />
            </span>
          )}
        </span>
      </button>

      <button
        onClick={onDelete}
        aria-label={t('deleteLesson')}
        title={t('deleteLesson')}
        className="relative z-10 rounded-lg p-1.5 text-slate-400 opacity-60 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
      >
        <CloseIcon className="size-4" />
      </button>
    </div>
  )
}
