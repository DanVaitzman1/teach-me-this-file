import ElapsedTime from '../../components/ElapsedTime'
import ErrorAlert from '../../components/ErrorAlert'

// Shown while the plan is being created, and if creating it failed.
export default function PlanningScreen({ lesson, onRetry, onCancel, onOpenSettings }) {
  const failed = lesson.status === 'plan_error'

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{failed ? 'Could not prepare the lesson' : 'Preparing your lesson…'}</h2>
        <p dir="auto" className="truncate text-sm text-slate-600">{lesson.document.fileName}</p>
      </div>

      {failed ? (
        <ErrorAlert error={lesson.error} onOpenSettings={onOpenSettings}>
          <button
            onClick={onRetry}
            className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
          >
            Try again
          </button>
        </ErrorAlert>
      ) : (
        <p role="status" className="flex items-center gap-2 text-sm text-slate-600">
          <span className="size-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          Reading the material and planning the steps… <ElapsedTime />
        </p>
      )}

      <div className="flex justify-end">
        <button
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          {failed ? 'Back' : 'Cancel'}
        </button>
      </div>
    </section>
  )
}
