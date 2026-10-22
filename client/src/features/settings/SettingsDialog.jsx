import { useState } from 'react'
import Dialog from '../../components/Dialog'
import { KeyIcon } from '../../components/Icons'

export default function SettingsDialog({ apiKey, hasServerKey, onSave, onClose }) {
  const [draft, setDraft] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    onSave(draft)
    onClose()
  }

  return (
    <Dialog title="Settings" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className={`flex items-center gap-3 rounded-xl p-3 text-sm ${
            apiKey || hasServerKey ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'
          }`}
        >
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-full ${
              apiKey || hasServerKey ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            <KeyIcon className="size-4" />
          </span>
          {apiKey ? 'Using your key.' : hasServerKey ? 'Using the server’s key.' : 'No key yet: the tutor can’t start without one.'}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="api-key" className="block text-sm font-medium text-slate-700">
            Gemini API key
          </label>
          <div className="flex gap-2">
            <input
              id="api-key"
              type={showKey ? 'text' : 'password'}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={hasServerKey ? 'Optional: the server has its own key' : 'Paste your key'}
              autoComplete="off"
              spellCheck={false}
              autoFocus
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="button"
              onClick={() => setShowKey((shown) => !shown)}
              className="rounded-lg border border-slate-300 px-3 text-sm text-slate-600 hover:bg-slate-50"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Kept only in this browser tab and sent with each request. The server never stores or logs it.
            Get a free key at{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-slate-700"
            >
              Google AI Studio
            </a>
            .
          </p>
        </div>

        <div className="flex justify-end gap-2">
          {apiKey && (
            <button
              type="button"
              onClick={() => {
                onSave('')
                onClose()
              }}
              className="me-auto rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Remove key
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </form>
    </Dialog>
  )
}
