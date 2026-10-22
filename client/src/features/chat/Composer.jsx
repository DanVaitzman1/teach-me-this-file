import { useState } from 'react'

// Well under the server's limit per message; an answer to a tutor's question is short.
const MAX_ANSWER_CHARS = 2000

// The student's input. While the tutor is writing, the student can keep typing
// but not send; the Send button becomes Stop.
export default function Composer({ busy, streaming, onSend, onStop }) {
  const [text, setText] = useState('')
  const canSend = text.trim() && !busy

  function send() {
    if (!canSend) return
    onSend(text.trim())
    setText('')
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
      className="flex items-end gap-2 border-t border-slate-200 p-3"
    >
      <label htmlFor="student-message" className="sr-only">
        Your answer
      </label>
      <textarea
        id="student-message"
        dir="auto"
        rows={2}
        value={text}
        maxLength={MAX_ANSWER_CHARS}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write your answer…"
        className="min-w-0 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
      {streaming ? (
        <button
          type="button"
          onClick={onStop}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Stop
        </button>
      ) : (
        <button
          type="submit"
          disabled={!canSend}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Send
        </button>
      )}
    </form>
  )
}
