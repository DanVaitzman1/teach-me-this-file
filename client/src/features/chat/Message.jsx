import RichText from '../../components/RichText'

function TypingDots() {
  return (
    <span className="flex gap-1 py-2" aria-label="The tutor is writing">
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="size-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </span>
  )
}

export default function Message({ message, onRetry, onShowSource }) {
  if (message.role === 'student') {
    return (
      <div dir="auto" className="ms-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl bg-indigo-600 px-4 py-2 text-white">
        {message.text}
      </div>
    )
  }

  return (
    <div className="max-w-[95%] space-y-2">
      {message.text ? (
        <div className="rich-text rounded-2xl bg-slate-50 px-4 py-3">
          <RichText>{message.text}</RichText>
        </div>
      ) : (
        message.status === 'streaming' && <TypingDots />
      )}

      {message.status === 'stopped' && <p className="text-xs text-slate-500">Stopped</p>}

      {message.status === 'done' && message.sourceIds?.length > 0 && (
        <button
          onClick={onShowSource}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
        >
          View source
        </button>
      )}

      {message.status === 'error' && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <span>{message.error.message}</span>
          <button onClick={onRetry} className="rounded-lg bg-red-600 px-3 py-1 font-medium text-white hover:bg-red-700">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
