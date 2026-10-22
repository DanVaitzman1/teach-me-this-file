import { DocumentIcon, SparklesIcon } from '../../components/Icons'
import RichText from '../../components/RichText'
import { useErrorMessage, useT } from '../../i18n/context'

function TutorAvatar() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-emerald-600 text-white shadow-sm">
      <SparklesIcon className="size-4" />
    </span>
  )
}

function TypingDots() {
  const t = useT()
  return (
    <span className="flex gap-1 px-1 py-1.5" aria-label={t('tutorWriting')}>
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="size-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </span>
  )
}

export default function Message({ message, onRetry, onShowSource }) {
  const t = useT()
  const errorMessage = useErrorMessage()
  if (message.role === 'student') {
    return (
      <div
        dir="auto"
        className="message-in ms-auto w-fit max-w-[85%] rounded-2xl rounded-ee-md bg-indigo-600 px-4 py-2.5 whitespace-pre-wrap text-white shadow-sm"
      >
        {message.text}
      </div>
    )
  }

  return (
    <div className="message-in flex max-w-[95%] gap-2.5">
      <TutorAvatar />
      <div className="min-w-0 space-y-1.5">
        {(message.text || message.status === 'streaming') && (
          <div className="rich-text rounded-2xl rounded-ss-md border border-indigo-100 bg-school-sky px-4 py-2.5 text-slate-800">
            {message.text ? <RichText>{message.text}</RichText> : <TypingDots />}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {message.status === 'done' && message.sourceIds?.length > 0 && (
            <button
              onClick={onShowSource}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <DocumentIcon className="size-3.5" />
              {t('viewSource')}
            </button>
          )}
          {message.status === 'stopped' && <span className="px-2 text-xs text-slate-400">{t('stopped')}</span>}
        </div>

        {message.status === 'error' && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <span dir="auto">{errorMessage(message.error)}</span>
            <button onClick={onRetry} className="rounded-lg bg-red-600 px-3 py-1 font-medium text-white hover:bg-red-500">
              {t('tryAgain')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
