import { Fragment, useEffect, useRef, useState } from 'react'
import { CheckIcon } from '../../components/Icons'
import RichText from '../../components/RichText'
import Composer from './Composer'
import Message from './Message'
import SourceDialog from './SourceDialog'
import { useT } from '../../i18n/context'
import { useDisplayPlan } from '../../lesson/useDisplayPlan'

// Distance from the bottom (px) within which new text keeps the view scrolled
// down. Further up, the student is reading back and we leave the scroll alone.
const STICKY_BOTTOM_PX = 80

// Between steps: a small "step done" badge, then the next step's name.
function StepDivider({ index, title, dir, language }) {
  const t = useT()
  return (
    <div className="space-y-3 pt-2">
      {index > 0 && (
        <p dir="auto" className="message-in mx-auto flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
          <CheckIcon className="size-3.5" /> {t('stepComplete', { n: index })}
        </p>
      )}
      <p className="flex items-center gap-3 text-xs font-medium text-slate-500">
        <span className="h-px flex-1 bg-slate-200" />
        <span dir={dir} lang={language}>
          {index + 1}. <RichText inline>{title}</RichText>
        </span>
        <span className="h-px flex-1 bg-slate-200" />
      </p>
    </div>
  )
}

function LessonComplete({ steps, onNewLesson }) {
  const t = useT()
  return (
    <div className="message-in space-y-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-surface p-5 text-center">
      <p className="pop-in text-4xl" aria-hidden="true">
        🎉
      </p>
      <div dir="auto" className="space-y-1">
        <p className="text-lg font-bold text-emerald-900">{t('lessonCompleteTitle')}</p>
        <p className="text-sm text-emerald-800">{t('lessonCompleteText', { n: steps.length })}</p>
      </div>
      <ul className="mx-auto max-w-sm space-y-1.5 text-start text-sm text-slate-700">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-2">
            <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
              <CheckIcon className="size-3" />
            </span>
            <RichText inline>{step.title}</RichText>
          </li>
        ))}
      </ul>
      <button
        onClick={onNewLesson}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
      >
        {t('startNewLesson')}
      </button>
    </div>
  )
}

export default function ChatPanel({ lesson, onDraftChange, onSend, onStop, onRetry, onNewLesson }) {
  const { messages, status, document } = lesson
  const plan = useDisplayPlan(lesson)
  const streaming = messages.some((message) => message.status === 'streaming')
  const listRef = useRef(null)
  const stickToBottom = useRef(true)
  // Which message's sources are open. Pure UI state, so it lives here, not in the lesson.
  const [sourceIds, setSourceIds] = useState(null)

  useEffect(() => {
    const list = listRef.current
    if (stickToBottom.current) list.scrollTop = list.scrollHeight
  }, [messages, status])

  function handleScroll() {
    const list = listRef.current
    stickToBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < STICKY_BOTTOM_PX
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} onScroll={handleScroll} role="log" dir={lesson.plan.dir} lang={lesson.plan.language} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <Fragment key={message.id}>
            {message.stepIndex !== messages[index - 1]?.stepIndex && (
              <StepDivider index={message.stepIndex} title={plan.steps[message.stepIndex].title} dir={plan.dir} language={plan.language} />
            )}
            <Message
              message={message}
              onRetry={() => onRetry(message.id)}
              onShowSource={() => setSourceIds(message.sourceIds)}
            />
          </Fragment>
        ))}

        {status === 'finished' && (
          <div dir={plan.dir} lang={plan.language}>
            <LessonComplete steps={plan.steps} onNewLesson={onNewLesson} />
          </div>
        )}
      </div>

      {sourceIds && (
        <SourceDialog
          passages={document.passages.filter((passage) => sourceIds.includes(passage.id))}
          isPdf={/\.pdf$/i.test(document.fileName)}
          onClose={() => setSourceIds(null)}
        />
      )}

      {status !== 'finished' && (
        <Composer
          text={lesson.draft ?? ''}
          onChange={onDraftChange}
          busy={streaming || Boolean(lesson.pendingTurn)}
          streaming={streaming}
          onSend={onSend}
          onStop={onStop}
        />
      )}
    </div>
  )
}
