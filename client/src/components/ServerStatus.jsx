// Shown until the server answers its health check. A free Render instance
// sleeps when idle, so the first visit can take up to a minute.
export default function ServerStatus({ status, onRetry }) {
  if (status === 'ready') return null

  if (status === 'error') {
    return (
      <div role="alert" className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <span>
          <b className="font-semibold">Can’t reach the server.</b> Check your connection and try again.
        </span>
        <button onClick={onRetry} className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700">
          Try again
        </button>
      </div>
    )
  }

  const slow = status === 'slow'
  return (
    <div role="status" className="mx-auto max-w-2xl space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="relative flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-indigo-500" />
        </span>
        <p className="font-medium text-slate-800">{slow ? 'Waking up the server…' : 'Connecting…'}</p>
      </div>
      {slow && (
        <>
          <p className="text-sm text-slate-600">
            It sleeps when nobody uses it (free hosting), so the first visit can take up to a minute. Thanks for waiting.
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-indigo-100">
            <div className="progress-indeterminate h-full w-1/3 rounded-full bg-indigo-500" />
          </div>
        </>
      )}
    </div>
  )
}
