import { useState } from 'react'
import Dialog from '../../components/Dialog'
import { KeyIcon } from '../../components/Icons'
import { useT } from '../../i18n/context'
import { LANGUAGES } from '../../i18n/strings'

// A row of options where exactly one is chosen (theme, language). Applies at once.
function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            value === option.value ? 'bg-surface text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default function SettingsDialog({ apiKey, hasServerKey, onSave, onClose, preferences, onPreferenceChange }) {
  const t = useT()
  const [draft, setDraft] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const hasKey = Boolean(apiKey) || hasServerKey

  function handleSubmit(event) {
    event.preventDefault()
    onSave(draft)
    onClose()
  }

  return (
    <Dialog title={t('settings')} onClose={onClose}>
      <div className="space-y-5">
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-slate-700">{t('appearance')}</h3>
          <SegmentedControl
            label={t('appearance')}
            value={preferences.theme}
            onChange={(theme) => onPreferenceChange('theme', theme)}
            options={[
              { value: 'light', label: t('themeLight') },
              { value: 'dark', label: t('themeDark') },
              { value: 'system', label: t('themeSystem') },
            ]}
          />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium text-slate-700">{t('language')}</h3>
          <SegmentedControl
            label={t('language')}
            value={preferences.language}
            onChange={(language) => onPreferenceChange('language', language)}
            options={Object.entries(LANGUAGES).map(([value, { label }]) => ({ value, label }))}
          />
          <p className="text-xs text-slate-500">{t('languageHelp')}</p>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-200 pt-5">
          <div
            className={`flex items-center gap-3 rounded-xl p-3 text-sm ${
              hasKey ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'
            }`}
          >
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-full ${
                hasKey ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              <KeyIcon className="size-4" />
            </span>
            {apiKey ? t('usingYourKey') : hasServerKey ? t('usingServerKey') : t('noKeyStatus')}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="api-key" className="block text-sm font-medium text-slate-700">
              {t('apiKeyLabel')}
            </label>
            <div className="flex gap-2">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                dir="ltr"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={hasServerKey ? t('keyPlaceholderOptional') : t('keyPlaceholder')}
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-surface px-3 py-2 font-mono text-sm placeholder:font-sans focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="button"
                onClick={() => setShowKey((shown) => !shown)}
                className="rounded-lg border border-slate-300 px-3 text-sm text-slate-600 hover:bg-slate-50"
              >
                {showKey ? t('hide') : t('show')}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {t('keyHelp')}{' '}
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
                {t('removeKey')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              {t('cancel')}
            </button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}
