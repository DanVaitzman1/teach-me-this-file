import ElapsedTime from '../../components/ElapsedTime'
import ErrorAlert from '../../components/ErrorAlert'
import { BookIcon, DocumentIcon } from '../../components/Icons'

// Placeholder rows for the plan while it is being written.
const SKELETON_WIDTHS = ['w-3/4', 'w-2/3', 'w-5/6', 'w-1/2']

// Shown while the plan is being created, and if creating it failed.
export default function PlanningScreen({ lesson, onRetry, onCancel, onOpenSettings }) {
  const failed = lesson.status === 'plan_error'

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <div className="space-y-3">
        <span className="relative mx-auto flex size-16 items-center justify-center">
          {!failed && <span className="absolute inset-0 animate-ping rounded-full bg-indigo-200 opacity-60" />}
          <span
            className={`relative grid size-16 place-items-center rounded-full ${
              failed ? 'bg-red-100 text-red-600' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
            }`}
          >
            <BookIcon className="size-8" />
          </span>
        </span>
        <h2 className="text-xl font-bold tracking-tight">
          {failed ? 'Could not prepare the lesson' : 'Preparing your lesson…'}
        </h2>
        <p className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
          <DocumentIcon className="size-4 shrink-0" />
          <span dir="auto" className="truncate">
            {lesson.document.fileName}
          </span>
        </p>
      </div>

      {failed ? (
        <div className="text-start">
          <ErrorAlert error={lesson.error} onOpenSettings={onOpenSettings}>
            <button onClick={onRetry} className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700">
              Try again
            </button>
          </ErrorAlert>
        </div>
      ) : (
        <div role="status" className="space-y-4">
          <p className="text-sm text-slate-600">
            The tutor is reading the material and splitting it into short steps. <ElapsedTime />
          </p>
          <ol className="mx-auto max-w-sm space-y-3" aria-hidden="true">
            {SKELETON_WIDTHS.map((width, index) => (
              <li key={width} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-slate-200 text-xs text-slate-400">
                  {index + 1}
                </span>
                <span
                  className={`h-3 animate-pulse rounded-full bg-slate-200 ${width}`}
                  style={{ animationDelay: `${index * 150}ms` }}
                />
              </li>
            ))}
          </ol>
        </div>
      )}

      <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
        {failed ? '← Back' : 'Cancel'}
      </button>
    </section>
  )
}
