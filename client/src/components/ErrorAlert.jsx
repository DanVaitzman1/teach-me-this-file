const KEY_ERRORS = ['MISSING_API_KEY', 'INVALID_API_KEY']

// An API error with its message, plus a shortcut to Settings when the key is the problem.
// Extra actions (e.g. "Try again") can be passed as children.
export default function ErrorAlert({ error, onOpenSettings, children }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      <span>{error.message}</span>
      <div className="flex shrink-0 gap-2">
        {KEY_ERRORS.includes(error.code) && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
          >
            Open settings
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
