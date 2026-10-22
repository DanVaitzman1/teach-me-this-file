import { useRef, useState } from 'react'
import { SendIcon, StopIcon } from '../../components/Icons'

// Well under the server's limit per message; an answer to a tutor's question is short.
const MAX_ANSWER_CHARS = 2000
// The box grows with the text up to this height, then scrolls.
const MAX_HEIGHT_PX = 160

// The student's input. While the tutor is writing, the student can keep typing
// but not send; the Send button becomes Stop.
export default function Composer({ busy, streaming, onSend, onStop }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)
  const canSend = text.trim() && !busy

  function resize() {
    const textarea = textareaRef.current
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT_PX)}px`
  }

  function send() {
    if (!canSend) return
    onSend(text.trim())
    setText('')
    requestAnimationFrame(resize)
  }

  function handleKeyDown(event) {
    // Enter sends, Shift+Enter adds a line. Not while an IME (e.g. for Chinese) is composing.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send()
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        send()
      }}
      className="border-t border-slate-100 bg-white p-3"
    >
      <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-1.5 ps-3 transition-shadow focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200">
        <label htmlFor="student-message" className="sr-only">
          Your answer
        </label>
        <textarea
          id="student-message"
          ref={textareaRef}
          dir="auto"
          rows={1}
          value={text}
          maxLength={MAX_ANSWER_CHARS}
          onChange={(event) => {
            setText(event.target.value)
            resize()
          }}
          onKeyDown={handleKeyDown}
          placeholder="Write your answer…"
          className="max-h-40 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm focus:outline-none"
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop the answer"
            title="Stop"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-800 text-white transition-colors hover:bg-slate-900"
          >
            <StopIcon className="size-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            title="Send"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400"
          >
            <SendIcon className="size-4" />
          </button>
        )}
      </div>
      <p className="mt-1.5 hidden px-1 text-xs text-slate-400 sm:block">
        {streaming ? 'The tutor is writing… you can stop it.' : 'Enter to send · Shift + Enter for a new line'}
      </p>
    </form>
  )
}
