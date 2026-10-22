import { useState } from 'react'
import { BookIcon, GearIcon, KeyIcon } from './components/Icons'
import ServerStatus from './components/ServerStatus'
import LessonScreen from './features/lesson/LessonScreen'
import PlanningScreen from './features/lesson/PlanningScreen'
import SettingsDialog from './features/settings/SettingsDialog'
import { useApiKey } from './features/settings/useApiKey'
import { usePreferences } from './features/settings/usePreferences'
import UploadScreen from './features/upload/UploadScreen'
import { LanguageContext, useT } from './i18n/context'
import { useLesson } from './lesson/useLesson'
import { useServerStatus } from './useServerStatus'

// Holds the display preferences and provides the interface language below.
function App() {
  const [preferences, setPreference] = usePreferences()
  return (
    <LanguageContext value={preferences.language}>
      <AppContent preferences={preferences} onPreferenceChange={setPreference} />
    </LanguageContext>
  )
}

function AppContent({ preferences, onPreferenceChange }) {
  const t = useT()
  const server = useServerStatus()
  const [apiKey, setApiKey] = useApiKey()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { lesson, start, retryPlan, sendMessage, stop, retryTurn, reset } = useLesson(apiKey)

  const openSettings = () => setSettingsOpen(true)
  const needsApiKey = server.status === 'ready' && !server.hasServerKey && !apiKey

  function renderScreen() {
    switch (lesson.status) {
      case 'idle':
        return (
          <UploadScreen
            apiKey={apiKey}
            onUploaded={({ document, teacherPrompt }) => start(document, teacherPrompt)}
            onOpenSettings={openSettings}
          />
        )
      case 'planning':
      case 'plan_error':
        return <PlanningScreen lesson={lesson} onRetry={retryPlan} onCancel={reset} onOpenSettings={openSettings} />
      case 'ready':
      case 'finished':
        return (
          <LessonScreen lesson={lesson} onSend={sendMessage} onStop={stop} onRetry={retryTurn} onNewLesson={reset} />
        )
    }
  }

  const inLesson = lesson.status === 'ready' || lesson.status === 'finished'
  const hasKey = Boolean(apiKey) || server.hasServerKey

  return (
    <div className="min-h-dvh bg-gradient-to-b from-indigo-50/70 via-slate-50 to-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <BookIcon className="size-5" />
            </span>
            <h1 className="font-bold tracking-tight text-slate-900">Teach Me This File</h1>
          </div>
          <button
            onClick={openSettings}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {server.status === 'ready' && (
              <span
                className={`size-2 rounded-full ${hasKey ? 'bg-emerald-500' : 'bg-amber-500'}`}
                title={hasKey ? t('keySet') : t('noKeyYet')}
              />
            )}
            <GearIcon className="size-4" />
            {t('settings')}
          </button>
        </div>
      </header>

      <main className={`mx-auto space-y-4 p-4 ${inLesson ? 'max-w-5xl' : 'max-w-2xl'}`}>
        <ServerStatus status={server.status} onRetry={server.retry} />

        {needsApiKey && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
              <KeyIcon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="font-semibold">{t('keyBannerTitle')}</b> {t('keyBannerText')}
            </span>
            <button
              onClick={openSettings}
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-500"
            >
              {t('addKey')}
            </button>
          </div>
        )}

        {server.status === 'ready' && renderScreen()}
      </main>

      {settingsOpen && (
        <SettingsDialog
          apiKey={apiKey}
          hasServerKey={server.hasServerKey}
          onSave={setApiKey}
          preferences={preferences}
          onPreferenceChange={onPreferenceChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}

export default App
