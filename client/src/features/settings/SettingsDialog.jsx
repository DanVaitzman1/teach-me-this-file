import { useState } from 'react'
import Dialog from '../../components/Dialog'

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
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
