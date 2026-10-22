import { Fragment, useEffect, useRef, useState } from 'react'
import RichText from '../../components/RichText'
import Composer from './Composer'
import Message from './Message'
import SourceDialog from './SourceDialog'

// Distance from the bottom (px) within which new text keeps the view scrolled
// down. Further up, the student is reading back and we leave the scroll alone.
const STICKY_BOTTOM_PX = 80

export default function ChatPanel({ lesson, onSend, onStop, onRetry, onNewLesson }) {
  const { messages, plan, status, document } = lesson
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
    <div className="flex h-[65dvh] min-h-96 flex-col lg:h-[calc(100dvh-14rem)]">
      <div ref={listRef} onScroll={handleScroll} role="log" className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <Fragment key={message.id}>
            {message.stepIndex !== messages[index - 1]?.stepIndex && (
              <p className="flex items-center gap-3 text-xs font-medium text-slate-500">
                <span className="h-px flex-1 bg-slate-200" />
                <span>
                  {message.stepIndex + 1}. <RichText inline>{plan.steps[message.stepIndex].title}</RichText>
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </p>
            )}
            <Message
              message={message}
              onRetry={() => onRetry(message.id)}
              onShowSource={() => setSourceIds(message.sourceIds)}
            />
          </Fragment>
        ))}

        {status === 'finished' && (
          // dir="auto": this English card sits inside a lesson that may be right-to-left.
          <div dir="auto" className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <p className="font-semibold">Lesson complete</p>
            <p className="text-sm">All {plan.steps.length} steps done.</p>
            <button
              onClick={onNewLesson}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Start a new lesson
            </button>
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
        <Composer busy={streaming || Boolean(lesson.pendingTurn)} streaming={streaming} onSend={onSend} onStop={onStop} />
      )}
    </div>
  )
}
