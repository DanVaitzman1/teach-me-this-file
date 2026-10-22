const MESSAGES = {
  connecting: 'Connecting to the server…',
  slow: 'Waking up the server. On the free plan this can take up to a minute…',
}

export default function ServerStatus({ status, onRetry }) {
  if (status === 'ready') return null

  if (status === 'error') {
    return (
      <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <span>Could not reach the server.</span>
        <button
          onClick={onRetry}
          className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div role="status" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
      <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      {MESSAGES[status]}
    </div>
  )
}
